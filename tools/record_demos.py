"""Script real solver states into short, explanatory recordings; no fake pose motion.

The ball/IK/passive recordings use the compiled app. The comparison uses two
instances of the same source plant/renderer. Playback is edited, not a benchmark.
"""
from __future__ import annotations
import argparse,hashlib,json,os,shutil,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/media';FPS=10;FRAMES=120
STYLE='''header,.sidebar,.telemetry,.hud,.view-actions,.viewport-footer,.floating-tools,#labels{display:none!important}.workspace,.main{display:block!important;width:100%!important;height:100vh!important;padding:0!important}.viewport{width:100vw!important;height:100vh!important;border-radius:0!important}#caption{position:fixed;left:22px;top:18px;right:22px;z-index:500;pointer-events:none;font:600 24px/1.25 system-ui;color:#163c49}#caption small{display:block;font:14px/1.5 system-ui;color:#5c7881;margin-top:6px}#lengths{position:fixed;bottom:12px;left:22px;right:22px;z-index:500;font:14px ui-monospace,monospace;color:#234952;background:#edf4f3de;padding:10px 14px;border-radius:8px}'''
def encode(frames,out):
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate',str(FPS),'-i',str(frames/'%04d.png'),'-an','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(out)],check=True,timeout=90)
def stamps(t):return f'00:00:{t:06.3f}'
def record(name,browser):
    page=browser.new_page(viewport={'width':960,'height':720},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    events=[];metrics=[]
    if name=='02-compliance':
        scripts='\n'.join((ROOT/'src'/x).read_text() for x in ['core.js','renderer.js','mechanical-view.js'])
        html='''<!doctype html><html lang="en"><meta charset="utf-8"><style>body{margin:0;background:#eaf0f3;font-family:system-ui;color:#183a47}.head{height:100px;box-sizing:border-box;padding:16px 24px;background:#edf4f3}h1{margin:0;font-size:26px}.row{display:flex}.half{width:50%;position:relative}.half b{position:absolute;top:14px;left:24px;font-size:18px}.half output{position:absolute;top:42px;left:24px;font:16px monospace}canvas{width:100%;height:570px}.foot{padding:8px 24px;font:13px system-ui}</style><div class="head"><h1>Same push. Different stiffness.</h1><div id="caption"></div></div><div class="row"><div class="half"><b>STIFF · K = 800 N/m</b><output id="r0"></output><canvas id="c0"></canvas></div><div class="half"><b>SOFT · K = 200 N/m</b><output id="r1"></output><canvas id="c1"></canvas></div></div><div class="foot">Actual force-driven models · identical force histories · edited playback, not a speed benchmark</div>'''
        page.set_content(html+'<script>'+scripts+'''\nwindow.sims=[Stewart.makeSimulation(),Stewart.makeSimulation()];window.views=sims.map((s,i)=>{s.settings.mode='compliance';s.settings.translationK=i?200:800;const r=new StewartRenderer(document.getElementById('c'+i));r.home();r.azimuth=1.5708;r.elevation=.8;r.distance=1.65;return r;});</script></html>''')
    else:
        page.set_content((ROOT/'site/index.html').read_text(),wait_until='load');page.wait_for_function('window.__stewartReady')
        page.evaluate("lab.reset(Stewart.createGeometry());lab.running=false;lab.renderer.home();lab.renderer.distance=1.8;lab.renderer.target=[0,0,.34]")
        page.add_style_tag(content=STYLE);page.evaluate("document.body.insertAdjacentHTML('beforeend','<div id=caption></div><div id=lengths></div>')")
        if name=='04-ball':page.evaluate('lab.startBall();lab.running=false;lab.renderer.distance=1.8;lab.renderer.elevation=.74')
    last=''
    with tempfile.TemporaryDirectory(prefix='stewart-video-') as td:
        frames=Path(td)
        for f in range(FRAMES):
            if name=='01-ik-fk':
                if f==0:page.evaluate("let s=Stewart.homeState(lab.sim.g);s.p=[.065,-.025,.595];s.q=Stewart.qEuler(.14,-.10,.06);lab.setTarget(s)")
                if f==45:
                    page.evaluate("let s=Stewart.homeState(lab.sim.g);s.p=[-.065,.035,.53];s.q=Stewart.qEuler(-.12,.08,0);window.lengthFixture=Stewart.kinematics(lab.sim.g,s).lengths;window.solution=Stewart.forwardKinematics(lab.sim.g,lengthFixture);if(!solution.ok)throw Error('FK fixture did not converge');lab.renderer.previewPose=solution.state")
                if f==66:page.evaluate('lab.setTarget(solution.state);lab.renderer.previewPose=null')
                caption='1 · IK: ask for a pose → six lengths' if f<45 else '2 · FK: different lengths → recovered pose' if f<66 else '3 · Apply: motors move the real plate to the FK result'
                page.evaluate('lab.runFor(.030)')
                values=page.evaluate('(window.lengthFixture && '+str(f>=45).lower()+') ? lengthFixture : Stewart.kinematics(lab.sim.g,lab.sim.target).lengths')
                text=('OUTPUT LENGTHS [mm]  ' if f<45 else 'INPUT LENGTHS [mm]  ')+ '  '.join(f'L{i+1} {v*1000:.1f}' for i,v in enumerate(values))
            elif name=='02-compliance':
                force=16 if f<40 else -16 if f<80 else 0
                page.evaluate("F=>{sims.forEach((s,i)=>{s.settings.external=[F,0,0,0,0,0];for(let k=0;k<75;k++)Stewart.step(s);views[i].render(s,null);document.getElementById('r'+i).textContent='X = '+(s.state.p[0]*1000).toFixed(1)+' mm';});}",force)
                caption=f'Force on BOTH plates: {force:+d} N' if force else 'Release both plates → return toward zero'
                values=page.evaluate('sims.map(s=>s.state.p[0]*1000)');text=''
                if f in [39,79,119]:metrics.append({'frame':f,'force_N':force,'x_mm':values})
            elif name=='03-passive':
                if f==0:page.evaluate("lab.preset('gravity');Stewart.impulse(lab.sim,[.8,0,0]);lab.running=false")
                if f==55:page.evaluate("lab.preset('passive');Stewart.impulse(lab.sim,[.6,0,0]);lab.running=false")
                caption='Gravity support: a push moves the plate without position return' if f<55 else 'Passive springs: deflect, dissipate, settle — without motors'
                page.evaluate('lab.runFor(.045)');text=page.evaluate("'X '+(lab.sim.state.p[0]*1000).toFixed(1)+' mm · Z '+(lab.sim.state.p[2]*1000).toFixed(1)+' mm · '+lab.sim.settings.mode")
            else:
                if f==30:page.evaluate('StewartBall.setTarget(lab.sim,[.105,.025])')
                if f==60:page.evaluate("lab.sim.ball.settings.path='circle'")
                if f==90:page.evaluate('StewartBall.setTarget(lab.sim,[0,0]);StewartBall.disturb(lab.sim,[.03,-.018,0])')
                if f==112:page.evaluate('StewartBall.reset(lab.sim)')
                caption='BALANCE · an off-centre ball returns to the target' if f<30 else 'TARGET · tilt the plate, not the ball' if f<60 else 'TRACE · keep the sphere rolling around a circle' if f<90 else 'PUSH · recover from a physical impulse' if f<112 else 'RESET · a new attempt, with no invisible wall'
                page.evaluate('lab.runFor(.085)' if f<112 else 'lab.runFor(.012)')
                state=page.evaluate('({p:StewartBall.position(lab.sim),target:lab.sim.ball.target,phase:lab.sim.ball.phase})')
                metrics.append({'frame':f,**state});assert state['phase']=='contact',state
                text=f"BALL [mm] {state['p'][0]*1000:+.0f}, {state['p'][1]*1000:+.0f}   TARGET [mm] {state['target'][0]*1000:+.0f}, {state['target'][1]*1000:+.0f}   Ideal state sensing"
            if caption!=last:events.append({'frame':f,'caption':caption});last=caption
            page.evaluate("({caption,text,compare})=>{let c=document.getElementById('caption');c.replaceChildren(document.createTextNode(caption));if(!compare){let s=document.createElement('small');s.textContent='Real solver states · scripted inputs · edited playback, not a speed benchmark';c.append(s);document.getElementById('lengths').textContent=text;}}",{'caption':caption,'text':text,'compare':name=='02-compliance'})
            page.screenshot(path=str(frames/f'{f:04}.png'))
            if f==35:shutil.copyfile(frames/f'{f:04}.png',OUT/(name+'.png'))
        assert not errors,errors;encode(frames,OUT/(name+'.mp4'))
    vtt=['WEBVTT','']
    for i,event in enumerate(events):
        end=events[i+1]['frame']/FPS if i+1<len(events) else 12
        vtt.extend([f"{stamps(event['frame']/FPS)} --> {stamps(end)}",event['caption'],''])
    (OUT/(name+'.vtt')).write_text('\n'.join(vtt),encoding='utf-8');page.close()
    return {'name':name,'duration_s':12,'events':events,'metrics':metrics,'page_errors':errors}
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--only',choices=['01-ik-fk','02-compliance','03-passive','04-ball']);args=parser.parse_args();OUT.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        report=[]
        for name in [args.only] if args.only else ['01-ik-fk','02-compliance','03-passive','04-ball']:
            report.append(record(name,browser));print('Recorded',name,flush=True)
        browser.close()
    (ROOT/'artifacts').mkdir(exist_ok=True);(ROOT/'artifacts/recordings.json').write_text(json.dumps({'html_sha256':hashlib.sha256((ROOT/'site/index.html').read_bytes()).hexdigest(),'clips':report},indent=2))
