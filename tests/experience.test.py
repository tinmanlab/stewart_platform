"""Regression tests for one-click lessons; physics stays in the existing solver."""
import json
import os
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.getenv('CHROMIUM_EXECUTABLE') or shutil.which('chromium'), headless=True, args=['--no-sandbox','--disable-dev-shm-usage'])
    page = browser.new_page(viewport={'width':1440,'height':900}, reduced_motion='reduce')
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content((ROOT/'site/index.html').read_text(), wait_until='load')
    page.wait_for_function('window.__stewartReady === true')
    assert page.locator('[data-lesson]').count()==5, 'Five visible one-click lesson buttons are required'
    for name in ['ik','fk','gravity','compliance','passive']:
        page.click(f'[data-lesson="{name}"]')
        assert page.evaluate('lab.lesson')==name
        assert not page.evaluate('lab.running'), 'Reduced-motion lessons must start paused'
        assert page.locator(f'[data-lesson="{name}"]').get_attribute('aria-pressed')=='true'
        assert page.locator('#lessonHint').is_visible(), name
        page.evaluate('lab.runFor(.1)')
        assert not page.evaluate('lab.sim.halted')
    page.click('[data-lesson="compliance"]')
    page.evaluate('lab.runFor(1.5)')
    loaded=page.evaluate('lab.sim.state.p[0]')
    assert abs(loaded-.02)<.002, loaded
    page.click('#lessonAction')
    page.evaluate('lab.runFor(1.5)')
    recovered=page.evaluate('lab.sim.state.p[0]')
    assert abs(recovered)<.001,recovered
    page.click('[data-lesson="fk"]')
    assert 'Converged' in page.locator('#fkResult').inner_text()
    # Fresh presets must not silently inherit a custom geometry or unstable gains.
    page.evaluate('lab.sim.g.platformMass=17;lab.sim.settings.translationK=9999')
    page.click('[data-lesson="compliance"]')
    assert page.evaluate('lab.sim.settings.translationK')==800
    assert page.evaluate('lab.sim.g.platformMass')!=17
    before=page.evaluate('JSON.stringify(lab.saveSnapshot())')
    assert not page.evaluate('lab.loadLesson("__proto__")')
    assert before==page.evaluate('JSON.stringify(lab.saveSnapshot())')
    page.locator('[data-lesson="ik"]').press('Space')
    assert page.evaluate('lab.lesson')=='ik', 'Space must activate a focused button, not global playback'
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
    assert not errors, errors
    (ROOT/'artifacts').mkdir(exist_ok=True)
    (ROOT/'artifacts/experience.json').write_text(json.dumps({'passed':True,'loaded_x_m':loaded,'recovered_x_m':recovered,'lessons':5,'reduced_motion':True,'errors':errors},indent=2))
    browser.close()
print('PASS: five lesson entries, FK, compliance, clean resets, reduced motion, mobile and invalid inputs')
