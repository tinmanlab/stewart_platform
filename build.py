"""Build the offline app; --site also renders the Markdown learning library."""
from __future__ import annotations
import argparse
import os
import hashlib
import html
import json
import re
import shutil
from pathlib import Path
ROOT = Path(__file__).resolve().parent
SITE = ROOT / 'site'

def assemble(directory: Path) -> str:
    text = (directory / 'shell.html').read_text(encoding='utf-8')
    for key, name in [('STYLE','style.css'),('CORE','core.js'),('RENDERER','renderer.js'),('APP','app.js'),('LESSONS','lessons.js')]:
        text = text.replace('/*__' + key + '__*/', (directory / name).read_text(encoding='utf-8'))
    if re.search(r'/\*__[A-Z]+__\*/', text):
        raise ValueError('Unexpanded build token')
    return text

def korean_original() -> bytes:
    # Frozen baseline shares Git blobs with v1.1; edits restore the exact v1.0 bytes.
    folder = ROOT / 'archive/ko'
    patch = json.loads((folder / 'restore.json').read_text(encoding='utf-8'))
    text = assemble(folder / 'baseline')
    if hashlib.sha256(text.encode()).hexdigest() != patch['base_sha256']:
        raise ValueError('Frozen archive baseline changed')
    for start, end, replacement in reversed(patch['edits']):
        text = text[:start] + replacement + text[end:]
    data = text.encode('utf-8')
    if hashlib.sha256(data).hexdigest() != patch['original_sha256']:
        raise ValueError('Korean original checksum mismatch')
    return data

def build_app() -> None:
    SITE.mkdir(exist_ok=True)
    text = assemble(ROOT / 'src')
    (SITE / 'index.html').write_text(text, encoding='utf-8')
    (SITE / 'ko').mkdir(exist_ok=True)
    (SITE / 'ko/index.html').write_bytes(korean_original())
    (SITE / '.nojekyll').touch()
    manifest = {'source_sha256': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'src').iterdir()) if p.is_file()}, 'english_html_sha256': hashlib.sha256(text.encode()).hexdigest(), 'korean_html_sha256': hashlib.sha256((SITE/'ko/index.html').read_bytes()).hexdigest()}
    (SITE / 'build.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print('Built offline English app and original Korean archive.')

def build_docs() -> None:
    from markdown_it import MarkdownIt
    md = MarkdownIt('commonmark', {'html': True}).enable('table')
    learn = SITE/'learn'
    learn.mkdir(exist_ok=True)
    shutil.copytree(ROOT/'docs/media', SITE/'media', dirs_exist_ok=True)
    template = (ROOT/'tools/learn-template.html').read_text()
    for p in sorted((ROOT/'docs').glob('*.md')):
        source = p.read_text()
        title = next((x[2:] for x in source.splitlines() if x.startswith('# ')), p.stem)
        body = md.render(source)
        # Markdown is canonical; only local navigation changes for the HTML projection.
        body = re.sub(r'href="([A-Z_]+)\.md([^"]*)"', r'href="\1.html\2"', body)
        body = body.replace('src="media/', 'src="../media/').replace('href="media/', 'href="../media/').replace('poster="media/', 'poster="../media/')
        body = body.replace('href="../src/', 'href="https://github.com/tinmanlab/stewart_platform/blob/main/src/')
        body = body.replace('href="../tests/', 'href="https://github.com/tinmanlab/stewart_platform/blob/main/tests/')
        body = body.replace('href="../CONTRIBUTING.md', 'href="https://github.com/tinmanlab/stewart_platform/blob/main/CONTRIBUTING.md')
        body = body.replace('https://tinmanlab.github.io/stewart_platform/?demo=', '../index.html?demo=')
        page = template.replace('<!--TITLE-->', html.escape(title)).replace('<!--CONTENT-->', body)
        (learn/(p.stem+'.html')).write_text(page)
    shutil.copyfile(learn/'START_HERE.html', learn/'index.html')
    shutil.copytree(ROOT/'examples', SITE/'examples', dirs_exist_ok=True)
    for p in ['LICENSE', 'CITATION.cff']:
        if (ROOT/p).exists(): shutil.copyfile(ROOT/p, SITE/p)
    print('Rendered learning pages, examples and media.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', action='store_true', help='also build learning pages; requires requirements-dev.txt')
    args = parser.parse_args()
    build_app()
    if args.site: build_docs()
