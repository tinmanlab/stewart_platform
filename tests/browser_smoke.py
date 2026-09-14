from pathlib import Path
import json,time,os,shutil
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
(root/'artifacts').mkdir(exist_ok=True)
errors=[];console_errors=[];requests=[]
with sync_playwright() as p:
    executable=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
    browser=p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl'])
    page=browser.new_page(viewport={'width':1512,'height':982},device_scale_factor=1)
    page.set_default_timeout(10000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
    page.on('request',lambda r:requests.append(r.url))
    # This runner blocks file:// by administrator policy; inject the exact standalone HTML.
    page.set_content((root/'site/index.html').read_text(),wait_until='load')
    page.wait_for_function('window.__stewartReady === true',timeout=20000)
    page.wait_for_timeout(700)
    page.evaluate('lab.runFor(.2)')
    state=page.evaluate('({time:lab.sim.state.t,halted:lab.sim.halted,error:lab.sim.error,z:lab.sim.state.p[2],webgl:!!lab.renderer.gl})')
    assert state['time']>.1,state
    assert not state['halted'],state
    page.screenshot(path=str(root/'artifacts/screenshot-overview.png'),full_page=True)
    print('Initial',state)
    # Actual 18-joint UI: switch P1 to passive and edit physical coefficients.
    page.click('[data-tab="joints"]')
    page.click('[data-joint="0:slider"]')
    page.select_option('#jointMode','passive')
    page.fill('#jointK','1450');page.locator('#jointK').press('Tab')
    page.fill('#jointC','55');page.locator('#jointC').press('Tab')
    assert page.evaluate('lab.sim.joints[0].slider.mode')=='passive'
    assert page.evaluate('lab.sim.joints[0].slider.k')==1450
    assert page.evaluate('lab.sim.joints[0].slider.c')==55
    page.click('[data-joint="2:top"]');page.select_option('#jointMode','active')
    assert page.evaluate('lab.sim.joints[2].top.mode')=='active'
    page.evaluate('lab.running=false')
    page.screenshot(path=str(root/'artifacts/screenshot-joints.png'),full_page=True)
    print('STAGE jointUI done',flush=True)
    # Deterministic physical compliance from UI preset and release button.
    page.click('[data-tab="control"]');page.click('[data-lesson="compliance"]')
    page.evaluate('lab.runFor(1.5)')
    response=page.evaluate('({x:lab.sim.state.p[0],halted:lab.sim.halted,error:lab.sim.error})')
    assert not response['halted'],response
    assert abs(response['x']-.02)<.002,response
    page.click('[data-tab="dynamics"]');page.click('#releaseForce')
    page.evaluate('lab.runFor(1.5)')
    recovery=page.evaluate('lab.sim.state.p[0]')
    assert abs(recovery)<.001,recovery
    print('STAGE compliance done',flush=True)
    # IK and independently solved FK.
    page.click('[data-tab="control"]');page.click('[data-mode="ik"]')
    page.fill('#pose0N','25');page.locator('#pose0N').dispatch_event('input')
    page.fill('#pose3N','4');page.locator('#pose3N').dispatch_event('input')
    page.evaluate('lab.runFor(1.5)')
    tracking=page.evaluate('Stewart.norm(Stewart.sub(lab.sim.state.p,lab.sim.target.p))')
    assert tracking<.002,tracking
    page.click('[data-tab="kinematics"]');page.click('#fkFromTarget');page.click('#solveFk')
    fk=page.locator('#fkResult').inner_text();assert 'Converged' in fk and 'Workspace checks passed' in fk,fk
    assert page.locator('#applyFk').is_enabled()
    page.click('#applyFk')
    print('STAGE FK done',flush=True)
    # Native file downloads and import, no server or npm.
    with page.expect_download() as info:page.click('#saveProject')
    download=info.value;download.save_as(str(root/'artifacts/browser-saved-project.json'))
    saved=json.loads((root/'artifacts/browser-saved-project.json').read_text())
    assert saved['schema']=='stewart-lab/1'
    page.set_input_files('#projectFile',str(root/'artifacts/browser-saved-project.json'))
    page.wait_for_timeout(300)
    assert not page.evaluate('lab.running')
    page.evaluate('lab.runFor(.1)')
    with page.expect_download() as info:page.click('#exportCsv')
    info.value.save_as(str(root/'artifacts/browser-telemetry.csv'))
    assert (root/'artifacts/browser-telemetry.csv').stat().st_size>1000
    print('STAGE download/import done',flush=True)
    # Dimension changes rebuild the actual mechanics, not only the rendered object.
    page.click('[data-tab="design"]');page.fill('#geo_platformMass','6')
    page.click('#applyGeometry');page.evaluate('lab.running=false')
    assert page.evaluate('lab.sim.g.platformMass')==6
    print('STAGE geometry done',flush=True)
    # Restore attractive moving test configuration for screenshots.
    page.click('#defaultGeometry');page.click('[data-tab="control"]');page.select_option('#trajectory','sway')
    page.wait_for_timeout(1700)
    page.evaluate('lab.running=false')
    page.screenshot(path=str(root/'artifacts/screenshot-overview.png'),full_page=True)
    print('STAGE desktop screenshot done',flush=True)
    # Responsive screen does not lose controls or overflow horizontally.
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(400)
    mobile=page.evaluate('({w:innerWidth,scroll:document.documentElement.scrollWidth,ready:__stewartReady})')
    assert mobile['scroll']<=mobile['w']+2,mobile
    page.screenshot(path=str(root/'artifacts/screenshot-mobile.png'),full_page=True)
    result={'passed':True,'initial':state,'compliance_loaded_x_m':response['x'],'compliance_recovery_x_m':recovery,'IK_position_error_m':tracking,'fk_text':fk,'page_errors':errors,'console_errors':console_errors,'network_requests':[u for u in requests if not u.startswith('file:')], 'mobile':mobile,'browser_version':browser.version,'launch_method':'exact HTML injected with page.set_content; runner file:// blocked by administrator policy'}
    (root/'artifacts/browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False,indent=2))
    assert not errors,errors
    assert not console_errors,console_errors
    assert not result['network_requests'],result['network_requests']
    # Lesson entry points reuse the tested controllers; unknown inputs do not mutate state.
    for lesson in ['ik','fk','gravity','compliance','passive']:
        assert page.evaluate('(name)=>lab.loadLesson(name)',lesson)
        page.evaluate('lab.runFor(.02)')
        assert not page.evaluate('lab.sim.halted')
    before=page.evaluate('JSON.stringify(lab.saveSnapshot())')
    assert not page.evaluate('lab.loadLesson("__proto__")')
    assert before==page.evaluate('JSON.stringify(lab.saveSnapshot())')
    # Fresh reduced-motion context starts paused. Escape dismisses the help dialog.
    reduced=browser.new_page(reduced_motion='reduce')
    reduced.on('pageerror',lambda e:errors.append(str(e)))
    reduced.set_content((root/'site/index.html').read_text(),wait_until='load')
    reduced.wait_for_function('window.__stewartReady === true')
    assert not reduced.evaluate('lab.running')
    reduced.click('#helpOpen');reduced.keyboard.press('Escape')
    assert not reduced.locator('#helpModal').evaluate('(e)=>e.classList.contains("show")')
    result['lesson_checks']=5
    result['unknown_lesson_unchanged']=True
    result['reduced_motion_paused']=True
    (root/'artifacts/browser-results.json').write_text(json.dumps(result,indent=2))
    assert not errors,errors
    browser.close()
