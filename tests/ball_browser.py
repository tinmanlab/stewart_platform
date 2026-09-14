"""Run the new ball interface. --url tests actual navigation, not injected HTML."""
from pathlib import Path
import argparse,json,os,shutil,threading,atexit
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--url');parser.add_argument('--serve',action='store_true');a=parser.parse_args()
(ROOT/'artifacts').mkdir(exist_ok=True)
if a.serve:
    if a.url:parser.error('Use --serve or --url, not both')
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start();atexit.register(server.shutdown)
    a.url=f'http://127.0.0.1:{server.server_port}/site/'
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1512,'height':982},reduced_motion='reduce')
    page.on('pageerror',lambda e:errors.append(str(e)))
    if a.url:page.goto(a.url.rstrip('/')+'/?demo=ball',wait_until='load',timeout=45000)
    else:page.set_content((ROOT/'site/index.html').read_text(),wait_until='load')
    page.wait_for_function('window.__stewartReady')
    if not a.url:page.evaluate('lab.startBall()')
    # A real URL must select Ball Lab itself; do not mask a broken route with JS.
    page.wait_for_function('!!lab.sim.ball')
    assert not page.evaluate('lab.running')
    assert page.locator('#ballTop').is_visible()
    assert page.evaluate('lab.sim.g.payloadMass')==0
    assert page.evaluate('!!lab.sim.actuator')
    assert page.locator('#ballDrive').input_value()=='servo'
    assert page.locator('#ballSensor').input_value()=='sampled'
    page.evaluate('lab.runFor(4)')
    assert page.evaluate('Math.hypot(...StewartBall.position(lab.sim))')<.02
    canvas=page.locator('#ballTop');canvas.click(position={'x':175,'y':110})
    assert page.evaluate('Math.hypot(...lab.sim.ball.goal)')>.04
    page.evaluate('lab.runFor(4)')
    state=page.evaluate('({p:StewartBall.position(lab.sim),goal:lab.sim.ball.goal,phase:lab.sim.ball.phase,webgl:!!lab.renderer.gl})')
    assert state['phase']=='contact',state
    page.screenshot(path=str(ROOT/'artifacts/ball-overview.png'),full_page=True)
    page.click('#ballPush');page.evaluate('lab.runFor(3)');assert not page.evaluate('lab.sim.halted')
    page.select_option('#ballSensor','sampled');page.evaluate('lab.runFor(.3)')
    assert page.evaluate('lab.sim.ball.sensor.delivered')>0
    with page.expect_download() as info:page.click('#saveProject')
    info.value.save_as(str(ROOT/'artifacts/ball-project.json'))
    page.set_input_files('#projectFile',str(ROOT/'artifacts/ball-project.json'));page.wait_for_timeout(100)
    assert page.evaluate('lab.sim.ball.settings.sensor')=='sampled'
    assert page.evaluate('!!lab.sim.actuator')
    assert json.loads((ROOT/'artifacts/ball-project.json').read_text())['schema']=='stewart-lab/2'
    page.locator('#driveParameters summary').click()
    page.fill('#ballSpeed','45');page.locator('#ballSpeed').press('Tab')
    page.fill('#ballCurrent','1.5');page.locator('#ballCurrent').press('Tab')
    page.fill('#ballFrequency','40');page.locator('#ballFrequency').press('Tab')
    assert abs(page.evaluate('lab.sim.actuator.parameters.velocityLimit')-.045)<1e-10
    assert page.evaluate('lab.sim.actuator.parameters.maxCurrent')==1.5
    assert page.evaluate('lab.sim.ball.settings.frequency')==40
    page.select_option('#ballDrive','ideal')
    assert not page.evaluate('!!lab.sim.actuator')
    page.select_option('#ballDrive','servo')
    assert page.evaluate('!!lab.sim.actuator')
    assert page.evaluate('lab.sim.ball.settings.frequency')==50
    page.click('#ballFall');page.evaluate('lab.runFor(1)')
    assert page.evaluate('lab.sim.ball.phase')!='contact'
    page.click('#ballResetAll');assert page.evaluate('lab.sim.ball.phase')=='contact'
    page.click('#ballExit');page.click('[data-lesson="compliance"]')
    page.evaluate('lab.runFor(1.5)')
    assert not page.evaluate('!!lab.sim.ball')
    assert abs(page.evaluate('lab.sim.state.p[0]')-.02)<.002
    page.evaluate('lab.startBall();lab.running=false')
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
    page.screenshot(path=str(ROOT/'artifacts/ball-mobile.png'),full_page=True)
    assert not errors,errors
    result={'passed':True,'navigation':'HTTP' if a.url else 'injected HTML (not hosted validation)','state':state,'page_errors':errors,'drive_controls_checked':True,'servo_roundtrip_checked':True,'browser':browser.version}
    (ROOT/'artifacts/ball-browser.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2));browser.close()
