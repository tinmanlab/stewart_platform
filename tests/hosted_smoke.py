"""Exercise the built site through HTTP, locally or at the deployed Pages URL.

Unlike browser_smoke.py this never injects HTML. It checks project-prefix routing,
all published bytes, real document navigation, playable video and direct lessons.
"""
from __future__ import annotations
import argparse
import faulthandler
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import threading
import time
from urllib.parse import urljoin
from urllib.request import Request, urlopen
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'

def fetch(url):
    with urlopen(Request(url,headers={'Cache-Control':'no-cache','User-Agent':'Stewart-Lab-Acceptance/1'}),timeout=25) as r:
        assert r.status==200,(url,r.status)
        return r.read()

def check(base,expected=None,readme=False):
    base=base.rstrip('/')+'/'
    OUT.mkdir(exist_ok=True)
    result={'base_url':base,'passed':False,'page_errors':[],'lessons':{},'videos':[]}
    def stage(name):
        result['stage']=name
        (OUT/'hosted-progress.json').write_text(json.dumps(result,indent=2))
        print('HOSTED:',name,flush=True)
    stage('Fetch source manifest')
    manifest=None
    for attempt in range(12):
        try:
            manifest=json.loads(fetch(base+'build.json?verify='+str(expected or 'local')))
            if expected and manifest.get('source_commit')!=expected:
                raise AssertionError(('Stale published commit',manifest.get('source_commit'),expected))
            break
        except Exception:
            if attempt==11:raise
            time.sleep(5)
    assets=manifest['files_sha256']
    for name in ['index.html','ko/index.html','learn/index.html','learn/GALLERY.html','media/lab-preview.gif']:
        assert name in assets,name
    stage('Verify every published file hash')
    for path,sha in assets.items():
        assert not path.startswith('/') and '..' not in PurePosixPath(path).parts,path
        data=fetch(urljoin(base,path)+'?verify='+sha[:16])
        assert hashlib.sha256(data).hexdigest()==sha,('Published bytes differ',path)
    assert hashlib.sha256(fetch(base+'ko/index.html')).hexdigest()=='a9e3ed420a902c0c6dc24a87596c380c4cb9d63280104ad7cd2a389d8cfdc870'
    result.update(source_commit=manifest['source_commit'],verified_files=len(assets))
    with sync_playwright() as p:
        stage('Launch browser')
        browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce')
        page.set_default_timeout(15000)
        page.set_default_navigation_timeout(45000)
        page.on('pageerror',lambda e:result['page_errors'].append(str(e)))
        result['codecs']=page.evaluate("""({webm:document.createElement("video").canPlayType("video/webm"),mp4:document.createElement("video").canPlayType('video/mp4; codecs="avc1.42E01E"')})""")
        def play_video(video,name):
            stage('Play '+name)
            video.scroll_into_view_if_needed()
            # Do not await play() itself: invalid source lists may never settle it.
            video.evaluate('(v)=>{v.muted=true;v.play().catch(e=>{v.dataset.playbackError=String(e)});}')
            try:
                page.wait_for_function('(v)=>v.currentTime>0.05 || v.error || v.dataset.playbackError',arg=video.element_handle(),timeout=15000)
            finally:
                state=video.evaluate('(v)=>({source:v.currentSrc,ready:v.readyState,network:v.networkState,time:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:null,media_error:v.error?.message,play_error:v.dataset.playbackError})')
                result['videos'].append(dict(name=name,**state))
                stage('Playback result: '+name)
            assert not state.get('media_error') and not state.get('play_error'),state
            assert state['ready']>=2 and state['time']>0 and state['duration'] and abs(state['duration']-12)<.1,state
            video.evaluate('(v)=>v.pause()')
        for name in ['ik','fk','compliance','gravity','passive']:
            stage('Lesson '+name)
            response=page.goto(base+'?demo='+name,wait_until='load',timeout=45000)
            assert response.status==200
            page.wait_for_function('window.__stewartReady === true')
            assert page.evaluate('lab.lesson')==name,name
            assert not page.evaluate('lab.running'),'Reduced motion ignored'
            assert page.locator('#lessonHint').is_visible()
            page.evaluate('lab.runFor(1.5)')
            assert not page.evaluate('lab.sim.halted'),name
            result['lessons'][name]=page.evaluate('({position_m:lab.sim.state.p,mode:lab.sim.settings.mode,webgl:!!lab.renderer.gl})')
            if name=='fk':assert 'Converged' in page.locator('#fkResult').inner_text()
            if name=='compliance':
                assert abs(page.evaluate('lab.sim.state.p[0]')-.02)<.002
                page.screenshot(path=str(OUT/'hosted-compliance.png'))
                page.click('#lessonAction');page.evaluate('lab.runFor(1.5)')
                result['recovery_x_m']=page.evaluate('lab.sim.state.p[0]')
                assert abs(result['recovery_x_m'])<.001
            if name=='passive':
                assert page.evaluate('lab.sim.joints.every(j=>j.slider.mode==="passive")')
                page.fill('#jointK','1450');page.locator('#jointK').press('Tab')
                page.fill('#jointC','55');page.locator('#jointC').press('Tab')
                assert page.evaluate('lab.sim.joints[0].slider.k')==1450
                assert page.evaluate('lab.sim.joints[0].slider.c')==55
        # Follow links as a user does. This catches /project/ subpath errors.
        stage('Follow learning navigation')
        page.click('a.learn-link');page.wait_for_url('**/learn/index.html')
        assert page.locator('h1').inner_text()=='Move it. Ask why.'
        assert not page.locator('video').evaluate('(v)=>!v.paused')
        page.screenshot(path=str(OUT/'hosted-learn.png'),full_page=True)
        play_video(page.locator('video').first,'overview')
        stage('Theory and heading anchors')
        page.locator('header nav a',has_text='Theory').click()
        assert page.locator('.toc a').count()>4
        page.locator('.toc summary').click()
        page.locator('.toc a').last.click()
        assert page.evaluate('location.hash.length>1')
        stage('Open video gallery')
        page.locator('header nav a',has_text='Videos').click()
        assert page.locator('video').count()==3
        for index,video in enumerate(page.locator('video').all(),1):
            play_video(video,'lesson '+str(index))
        stage('Gallery images')
        for image in page.locator('img:visible').all():
            image.scroll_into_view_if_needed()
            page.wait_for_function('(i)=>i.complete && i.naturalWidth>0',arg=image.element_handle())
        stage('Original Korean app')
        page.goto(base+'ko/index.html',wait_until='load')
        page.wait_for_function('window.__stewartReady === true')
        result['korean_initializes']=True
        stage('Mobile layout')
        page.goto(base+'?demo=ik');page.wait_for_function('window.__stewartReady === true')
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
        result['mobile_no_overflow']=True
        page.screenshot(path=str(OUT/'hosted-mobile.png'),full_page=True)
        if readme:
            # Check the actual GitHub-rendered README, including its image proxy.
            stage('GitHub-rendered README animation')
            gh=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='no-preference')
            url='https://github.com/tinmanlab/stewart_platform/tree/'+expected+'#readme'
            gh.goto(url,wait_until='domcontentloaded',timeout=60000)
            image=gh.locator('img[alt^="Actual simulator walkthrough:"]').first
            image.scroll_into_view_if_needed(timeout=30000)
            gh.wait_for_function('Array.from(document.images).some(i=>i.alt.startsWith("Actual simulator walkthrough:")&&i.complete&&i.naturalWidth>0)',timeout=45000)
            result['github_readme_image']=image.evaluate('(i)=>({loaded:i.naturalWidth>0,source:i.currentSrc})')
            gh.screenshot(path=str(OUT/'github-readme.png'))
        result['browser_version']=browser.version
        assert not result['page_errors'],result['page_errors']
        stage('Close browser')
        browser.close()
    result['passed']=True
    stage('Passed')
    (OUT/'hosted-results.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url')
    parser.add_argument('--expected-commit')
    parser.add_argument('--readme',action='store_true')
    args=parser.parse_args()
    if args.readme and not args.expected_commit:parser.error("--readme requires --expected-commit")
    faulthandler.dump_traceback_later(90,repeat=True)
    server=None
    try:
        if not args.base_url:
            # Serve at /site/, not /, to test relative links under a project prefix.
            class Quiet(SimpleHTTPRequestHandler):
                def log_message(self,*args):pass
            server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
            threading.Thread(target=server.serve_forever,daemon=True).start()
            args.base_url=f'http://127.0.0.1:{server.server_port}/site/'
        check(args.base_url,args.expected_commit,args.readme)
    finally:
        if server:server.shutdown()
        faulthandler.cancel_dump_traceback_later()
