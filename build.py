"""Build the offline app; --site renders a self-contained learning website."""
from __future__ import annotations
import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
ROOT = Path(__file__).resolve().parent
SITE = ROOT/'site'
PUBLIC = 'https://tinmanlab.github.io/stewart_platform/'

def assemble(directory: Path) -> str:
    text = (directory/'shell.html').read_text(encoding='utf-8')
    extensions={'CORE':'ball.js','RENDERER':'mechanical-view.js','LESSONS':'ball-ui.js'}
    for key,name in [('STYLE','style.css'),('CORE','core.js'),('RENDERER','renderer.js'),('APP','app.js'),('LESSONS','lessons.js')]:
        code=(directory/name).read_text(encoding='utf-8')
        # Explicit maintained-runtime extension points; the frozen archive is untouched.
        if directory==ROOT/'src' and key in extensions:
            code+='\n'+(directory/extensions[key]).read_text(encoding='utf-8')
        text=text.replace('/*__'+key+'__*/',code)
    if re.search(r'/\*__[A-Z]+__\*/',text):
        raise ValueError('Unexpanded build token')
    return text

def korean_original() -> bytes:
    folder = ROOT/'archive/ko'
    patch = json.loads((folder/'restore.json').read_text(encoding='utf-8'))
    text = assemble(folder/'baseline')
    if hashlib.sha256(text.encode()).hexdigest() != patch['base_sha256']:
        raise ValueError('Frozen archive baseline changed')
    for start,end,replacement in reversed(patch['edits']):
        text = text[:start]+replacement+text[end:]
    data = text.encode('utf-8')
    if hashlib.sha256(data).hexdigest() != patch['original_sha256']:
        raise ValueError('Korean original checksum mismatch')
    return data

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_manifest() -> None:
    commit = os.environ.get('GITHUB_SHA')
    if not commit:
        try:
            commit = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,stderr=subprocess.DEVNULL,text=True).strip()
        except (OSError,subprocess.CalledProcessError):
            commit = None
    manifest = {
        'source_commit':commit,
        'source_sha256':{str(p.relative_to(ROOT)):digest(p) for p in sorted((ROOT/'src').iterdir()) if p.is_file()},
        'english_html_sha256':digest(SITE/'index.html'),
        'korean_html_sha256':digest(SITE/'ko/index.html'),
        'files_sha256':{str(p.relative_to(SITE)):digest(p) for p in sorted(SITE.rglob('*')) if p.is_file() and p != SITE/'build.json'}
    }
    (SITE/'build.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')

def build_app() -> None:
    SITE.mkdir(exist_ok=True)
    (SITE/'index.html').write_text(assemble(ROOT/'src'),encoding='utf-8')
    (SITE/'ko').mkdir(exist_ok=True)
    (SITE/'ko/index.html').write_bytes(korean_original())
    (SITE/'.nojekyll').unlink(missing_ok=True)
    write_manifest()
    print('Built offline English app and checksum-verified Korean archive.')

def render_document(md, source: str) -> tuple[str,str]:
    tokens=md.parse(source);used={};toc=[]
    for i,token in enumerate(tokens):
        if token.type!='heading_open':continue
        label=tokens[i+1].content
        stem=re.sub(r'[^a-z0-9\s-]','',label.lower()).strip().replace(' ','-') or 'section'
        count=used.get(stem,0);used[stem]=count+1
        anchor=stem+('-'+str(count) if count else '')
        token.attrSet('id',anchor)
        if token.tag=='h2':toc.append(f'<a href="#{anchor}">{html.escape(label)}</a>')
    body=md.renderer.render(tokens,md.options,{})
    return body,'<details class="toc"><summary>On this page</summary><nav aria-label="On this page">'+''.join(toc)+'</nav></details>'

def build_docs() -> None:
    from markdown_it import MarkdownIt
    md=MarkdownIt('commonmark',{'html':True}).enable('table')
    learn=SITE/'learn';learn.mkdir(exist_ok=True)
    shutil.copytree(ROOT/'docs/media',SITE/'media',dirs_exist_ok=True)
    for video in sorted((SITE/'media').glob('*.mp4')):
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(video),'-an','-c:v','libvpx-vp9','-deadline','good','-cpu-used','5','-crf','32','-b:v','0','-row-mt','1',str(video.with_suffix('.webm'))],check=True,timeout=120)
    template=(ROOT/'tools/learn-template.html').read_text(encoding='utf-8')
    for path in sorted((ROOT/'docs').glob('*.md')):
        source=path.read_text(encoding='utf-8')
        title=next((x[2:] for x in source.splitlines() if x.startswith('# ')),path.stem)
        body,toc=render_document(md,source)
        body=re.sub(r'href="([A-Z_]+)\.md([^"]*)"',r'href="\1.html\2"',body)
        for attr in ['src','href','poster']:body=body.replace(attr+'="media/',attr+'="../media/')
        for folder in ['src','tests']:body=body.replace(f'href="../{folder}/',f'href="https://github.com/tinmanlab/stewart_platform/blob/main/{folder}/')
        body=body.replace('href="../CONTRIBUTING.md','href="https://github.com/tinmanlab/stewart_platform/blob/main/CONTRIBUTING.md')
        body=body.replace(PUBLIC,'../')
        body=re.sub(r'(<source src="([^"]+)\.mp4" type="video/mp4">)',r'<source src="\2.webm" type="video/webm">\1',body)
        page=template.replace('<!--TITLE-->',html.escape(title)).replace('<!--TOC-->',toc).replace('<!--CONTENT-->',body)
        (learn/(path.stem+'.html')).write_text(page,encoding='utf-8')
    shutil.copyfile(learn/'START_HERE.html',learn/'index.html')
    shutil.copytree(ROOT/'examples',SITE/'examples',dirs_exist_ok=True)
    for name in ['LICENSE','CITATION.cff']:shutil.copyfile(ROOT/name,SITE/name)
    recovery='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — Stewart Platform Lab</title><body style="font:18px/1.6 system-ui;max-width:650px;margin:12vh auto;padding:24px"><h1>This page has moved or does not exist.</h1><p>Your simulation runs locally in the browser; no project is stored on this server.</p><p><a href="'+PUBLIC+'">Open the simulator</a> · <a href="'+PUBLIC+'learn/">Learning guide</a></p></body></html>'
    (SITE/'404.html').write_text(recovery,encoding='utf-8')
    write_manifest()
    print('Rendered linked learning pages, recovery page, media and full output manifest.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site',action='store_true',help='build the complete learning site; requires requirements-dev.txt')
    args=parser.parse_args()
    if args.site and SITE.exists():shutil.rmtree(SITE)
    build_app()
    if args.site:build_docs()
