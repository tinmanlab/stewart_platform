"""Record real browser controls and deterministic physics frames, then encode MP4.

These are slowed simulation-time replays, not wall-clock throughput measurements.
The exact self-contained HTML is loaded with set_content so the recorder also
works in browser runners whose navigation is administratively restricted.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/media'
FPS=10
FRAMES=120

def run(name: str, browser, output: Path) -> dict:
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1,reduced_motion='reduce')
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content((ROOT/'site/index.html').read_text(),wait_until='load')
    page.wait_for_function('window.__stewartReady === true')
    page.evaluate('lab.reset(); lab.running=false; lab.updateTelemetry()')
    page.add_style_tag(content='''#recordCaption{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#102e3bf5;color:#f4faf7;padding:17px 28px;font:20px/1.35 system-ui;min-height:80px;border-top:2px solid #38b89e}#recordCaption small{display:block;font-size:12px;color:#b5cec4;margin-top:5px}.record-focus{outline:3px solid #bd6b1d!important;outline-offset:2px!important}''')
    page.evaluate('document.body.insertAdjacentHTML("beforeend",\'<div id="recordCaption" role="status"></div>\')')
    milestones=[];last_caption=''
    with tempfile.TemporaryDirectory(prefix='stewart-frames-') as temporary:
        frames=Path(temporary)
        for frame in range(FRAMES):
            dt=0.
            if name=='01-ik-fk':
                if frame==0:
                    caption='01 / Move a target. Six motors cooperate.'
                    page.click('[data-tab="control"]')
                if frame==15:
                    caption='Ask for X = 25 mm, Z = 575 mm and roll = 4 degrees.'
                    for i,v in [(0,'25'),(2,'575'),(3,'4')]:
                        page.fill(f'#pose{i}N',v);page.locator(f'#pose{i}N').dispatch_event('input')
                if 20<=frame<80:dt=.025
                if frame==45:caption='The solid platform moves through dynamics; the target is only an outline.'
                if frame==80:
                    caption='Now copy target lengths and solve forward kinematics independently.'
                    page.click('[data-tab="kinematics"]');page.click('#fkFromTarget');page.click('#solveFk')
                    assert 'Converged' in page.locator('#fkResult').inner_text()
                if frame==102:
                    caption='Apply FK as a control target. Do not overwrite the physical pose.'
                    page.click('#applyFk')
            elif name=='02-compliance':
                if frame==0:
                    caption='02 / A robot can behave like a spring.'
                    page.click('[data-tab="control"]')
                if frame==15:
                    page.click('[data-preset="compliance"]');page.evaluate('lab.running=false')
                    caption='Apply +X 16 N with K = 800 N/m. Predict the displacement.'
                if 20<=frame<60:dt=.0375
                if frame==60:
                    x=page.evaluate('lab.sim.state.p[0]*1000')
                    assert abs(x-20)<1
                    caption=f'Measured {x:.2f} mm. At equilibrium: displacement = force / stiffness.'
                    milestones.append({'frame':frame,'loaded_x_mm':x})
                if frame==75:
                    caption='Release the external force. The virtual spring brings the platform back.'
                    page.click('[data-tab="dynamics"]');page.click('#releaseForce')
                if 78<=frame<118:dt=.0375
            else:
                if frame==0:
                    caption='03 / Gravity compensation is not position control.'
                    page.click('[data-preset="gravity"]');page.evaluate('lab.running=false')
                if 5<=frame<25:dt=.025
                if frame==25:
                    caption='At rest, the motors compensate the weight predicted by the model.'
                if frame==40:
                    page.click('[data-preset="passive"]');page.evaluate('lab.running=false')
                    page.click('[data-tab="joints"]');page.click('[data-joint="0:slider"]')
                    caption='Switch to passive sliders. They still have springs and dampers.'
                if 45<=frame<85:dt=.025
                if frame==85:
                    caption='Change P1 stiffness to 1450 N/m and damping to 55 N·s/m.'
                    for selector,value in [('#jointK','1450'),('#jointC','55')]:
                        page.fill(selector,value);page.locator(selector).press('Tab')
                    assert page.evaluate('lab.sim.joints[0].slider.k')==1450
                    assert page.evaluate('lab.sim.joints[0].slider.c')==55
                if 90<=frame<118:dt=.025
            if dt:page.evaluate('(dt)=>lab.runFor(dt)',dt)
            else:page.evaluate('lab.running=false;lab.updateTelemetry();lab.renderer.render(lab.sim,{i:0,type:"slider"})')
            if caption!=last_caption:
                milestones.append({'frame':frame,'caption':caption})
                last_caption=caption
            simtime=page.evaluate('lab.sim.state.t')
            page.evaluate('({caption,time})=>{let e=document.getElementById("recordCaption");e.replaceChildren();e.append(document.createTextNode(caption));let s=document.createElement("small");s.textContent="Actual simulator controls · deterministic, slowed playback · simulation time "+time.toFixed(3)+" s · not a real-time benchmark";e.append(s)}',{'caption':caption,'time':simtime})
            page.screenshot(path=str(frames/f'{frame:04}.png'))
            if frame==60:shutil.copyfile(frames/f'{frame:04}.png',output/(name+'.png'))
        assert not errors,errors
        assert not page.evaluate('lab.sim.halted')
        subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate',str(FPS),'-i',str(frames/'%04d.png'),'-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(output/(name+'.mp4'))],check=True)
        # A small animated preview is useful in README, but full lessons do not autoplay.
        if name=='02-compliance':
            subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(output/(name+'.mp4')),'-vf','fps=8,scale=720:-1:flags=lanczos','-loop','0',str(output/'compliance-preview.gif')],check=True)
    end=page.evaluate('({position_m:lab.sim.state.p,time_s:lab.sim.state.t,webgl:!!lab.renderer.gl})')
    caption_events=[x for x in milestones if 'caption'in x]
    def stamp(t):return f'{int(t//3600):02}:{int(t//60)%60:02}:{t%60:06.3f}'
    vtt=['WEBVTT','']
    for i,event in enumerate(caption_events):
        finish=caption_events[i+1]['frame']/FPS if i+1<len(caption_events) else FRAMES/FPS
        vtt.extend([f"{stamp(event['frame']/FPS)} --> {stamp(finish)}",event['caption'],''])
    (output/(name+'.vtt')).write_text('\n'.join(vtt))
    page.close()
    return {'name':name,'duration_s':FRAMES/FPS,'fps':FPS,'playback':'deterministic slowed simulation frames; real UI actions','milestones':milestones,'final':end,'page_errors':errors}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only',choices=['01-ik-fk','02-compliance','03-passive'])
    args=parser.parse_args();OUT.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        names=[args.only] if args.only else ['01-ik-fk','02-compliance','03-passive']
        results=[]
        for name in names:
            result=run(name,browser,OUT);results.append(result);print('Recorded',name,flush=True)
        browser.close()
    (ROOT/'artifacts').mkdir(exist_ok=True)
    report={'html_sha256':hashlib.sha256((ROOT/'site/index.html').read_bytes()).hexdigest(),'clips':results}
    (ROOT/'artifacts/recordings.json').write_text(json.dumps(report,indent=2))
