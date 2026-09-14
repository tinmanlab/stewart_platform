"""User journeys: mode ownership, return paths, reset, saved state and inert UI.
HTTP is the CI/Pages gate. --injected labels a restricted local-runner fallback.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import argparse,json,os,shutil,threading,unittest
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--url');parser.add_argument('--injected',action='store_true');args=parser.parse_args()
report={'navigation':'injected HTML' if args.injected else 'HTTP','page_errors':[]};server=None
if not args.url and not args.injected:
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();args.url=f'http://127.0.0.1:{server.server_port}/site/'
class Journeys(unittest.TestCase):
 def setUp(self):
  p=self.page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce');p.set_default_timeout(3000);p.on('pageerror',lambda e:report['page_errors'].append(str(e)))
  if args.injected:
   p.set_content((ROOT/'site/index.html').read_text(),wait_until='load');p.wait_for_function('window.__stewartReady===true');p.evaluate('lab.startBall()')
  else:self.assertEqual(p.goto(args.url.rstrip('/')+'/?demo=ball',wait_until='load',timeout=45000).status,200)
  p.wait_for_function('window.__stewartReady===true && !!lab.sim.ball');p.evaluate('lab.running=false')
 def tearDown(self):self.page.close()
 def test_manual_to_ball_preserves_drive_and_resumes_loop(self):
  p=self.page;p.evaluate('window.originalSim=lab.sim;window.originalDrive=lab.sim.actuator');p.click('[data-tab="control"]');p.click('[data-mode="manual"]')
  self.assertFalse(p.evaluate('lab.sim.ball.settings.control'),'Manual must suspend the ball controller')
  p.click('[data-tab="ball"]');self.assertEqual(p.evaluate('lab.sim.settings.mode'),'ik');self.assertTrue(p.evaluate('lab.sim.ball.settings.control'));self.assertTrue(p.evaluate('lab.sim===originalSim && lab.sim.actuator===originalDrive'));self.assertTrue(p.locator('#ballTop').is_visible())
 def test_manual_target_not_overwritten(self):
  p=self.page;p.evaluate("lab.setMode('manual');let q=Stewart.homeState(lab.sim.g);q.q=Stewart.qEuler(.025,0,0);lab.setTarget(q);window.manualTarget=JSON.stringify(lab.sim.target.q);lab.runFor(.02)")
  self.assertTrue(p.evaluate('JSON.stringify(lab.sim.target.q)===manualTarget'))
 def test_global_reset_keeps_ball_and_servo(self):
  p=self.page;p.click('#reset');self.assertTrue(p.evaluate('!!lab.sim.ball && !!lab.sim.actuator'));self.assertTrue(p.locator('#ballTop').is_visible());self.assertFalse(p.evaluate('lab.running'))
 def test_reset_ball_after_fall_recovers_without_changing_profile(self):
  p=self.page;p.select_option('#ballDrive','ideal');p.click('#ballFall');p.evaluate('lab.runFor(.8)');self.assertNotEqual(p.evaluate('lab.sim.ball.phase'),'contact');p.click('#ballReset')
  self.assertEqual(p.evaluate('lab.sim.settings.mode'),'ik');self.assertTrue(p.evaluate('lab.sim.ball.settings.control'));self.assertEqual(p.evaluate('lab.sim.ball.settings.path'),'point');self.assertFalse(p.evaluate('!!lab.sim.actuator'))
 def test_ineffective_controls_disabled(self):
  p=self.page;p.click('[data-tab="control"]');self.assertTrue(p.locator('#pose0N').is_disabled());self.assertTrue(p.locator('#translationK').is_disabled());p.click('[data-tab="joints"]');p.click('[data-joint="0:slider"]');self.assertTrue(p.locator('#jointKp').is_disabled());p.click('[data-joint="0:top"]');self.assertTrue(p.locator('#jointManual0').is_disabled())
 def test_blank_sensor_field_not_silently_zero(self):
  p=self.page;before=p.evaluate('lab.sim.ball.settings.latency');p.fill('#ballLatency','');p.locator('#ballLatency').press('Tab');self.assertEqual(p.evaluate('lab.sim.ball.settings.latency'),before);self.assertEqual(float(p.locator('#ballLatency').input_value()),before*1000)
 def test_new_sensor_delay_clears_old_queue(self):
  p=self.page;p.evaluate('lab.runFor(.02)');self.assertGreater(p.evaluate('lab.sim.ball.sensor.queue.length'),0);p.fill('#ballLatency','80');p.locator('#ballLatency').press('Tab');self.assertEqual(p.evaluate('lab.sim.ball.sensor.queue.length'),0)
 def test_import_invalidates_fk_and_opens_saved_experiment(self):
  p=self.page;ball=p.evaluate('JSON.stringify(Stewart.snapshot(lab.sim))');p.click('#ballExit');p.click('[data-lesson="fk"]');self.assertTrue(p.locator('#applyFk').is_enabled());p.set_input_files('#projectFile',{'name':'saved.json','mimeType':'application/json','buffer':ball.encode()});p.wait_for_function('!!lab.sim.ball')
  self.assertTrue(p.locator('#applyFk').is_disabled(),'Old FK solution survived import');self.assertTrue(p.locator('#ballTop').is_visible());self.assertFalse(p.evaluate('lab.running'))
 def test_preset_drops_derived_rotor_mass_with_servo(self):
  p=self.page;p.click('[data-tab="control"]');p.evaluate("lab.preset('compliance')");self.assertFalse(p.evaluate('!!lab.sim.actuator'));self.assertEqual(p.evaluate('lab.sim.g.motorReflectedMass'),0)
 def test_help_blocks_run_shortcut_and_restores_focus(self):
  p=self.page;p.click('#helpOpen');self.assertTrue(p.evaluate('document.activeElement.closest("#helpModal")!==null'));p.keyboard.press('Tab');self.assertEqual(p.evaluate('document.activeElement.id'),'helpStart');p.keyboard.press('Tab');self.assertEqual(p.evaluate('document.activeElement.id'),'helpClose');self.assertFalse(p.evaluate('lab.running'));p.keyboard.press('Escape');self.assertFalse(p.locator('#helpModal').is_visible());self.assertEqual(p.evaluate('document.activeElement.id'),'helpOpen')
 def test_visible_mobile_return_path(self):
  p=self.page;p.set_viewport_size({'width':390,'height':844});self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),392);self.assertTrue(p.locator('#ballHome').is_visible());p.click('[data-tab="control"]');p.click('[data-mode="manual"]');p.locator('#ballHome').press('Enter');self.assertEqual(p.evaluate('lab.sim.settings.mode'),'ik');self.assertTrue(p.locator('#ballTop').is_visible());p.screenshot(path=str(ROOT/'artifacts/usability-mobile.png'),full_page=True)
 def test_ball_target_overlay_toggle_has_effect(self):
  p=self.page
  p.evaluate("window.originalRing=lab.renderer.ring;lab.renderer.ring=function(p,q,r,color){if(color===0x118b83)window.targetRings++;return originalRing.call(this,p,q,r,color);};void 0")
  def count():return p.evaluate("(()=>{window.targetRings=0;lab.renderer.lastRendered=null;lab.renderer.render(lab.sim,null);return targetRings;})()")
  self.assertEqual(count(),1);p.click('#ghostToggle');self.assertEqual(count(),0)
 def test_fk_previous_seed_not_replaced_by_live_telemetry(self):
  p=self.page;p.click('#ballExit');p.click('[data-lesson="fk"]');p.click('#solveFk')
  p.evaluate("window.expectedSeed=Stewart.forwardKinematics(lab.sim.g,Stewart.kinematics(lab.sim.g,lab.sim.target).lengths).state.p")
  p.click('#fkFromActual');p.evaluate('lab.updateTelemetry()');p.select_option('#fkSeed','last')
  observed=p.evaluate("(()=>{let original=Stewart.forwardKinematics,seed;Stewart.forwardKinematics=(g,l,s)=>{seed=s.p.slice();return original(g,l,s);};document.querySelector('#solveFk').click();Stewart.forwardKinematics=original;return {seed,expected:expectedSeed};})()")
  self.assertLess(sum((a-b)**2 for a,b in zip(observed['seed'],observed['expected'])),1e-12)
 def test_halt_has_full_reset_exit(self):
  p=self.page;p.evaluate("lab.sim.halted=true;lab.sim.error='Test-only numerical stop';lab.updateTelemetry()");p.wait_for_timeout(150);self.assertIn('STOP',p.locator('#ballStatus').inner_text());p.click('#ballResetAll');self.assertFalse(p.evaluate('lab.sim.halted'));self.assertTrue(p.evaluate('!!lab.sim.actuator'))
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);(ROOT/'artifacts').mkdir(exist_ok=True)
 try:
  result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Journeys));report.update(passed=result.wasSuccessful() and not report['page_errors'],run=result.testsRun,failures=[str(t)+': '+s for t,s in result.failures+result.errors],browser=browser.version);(ROOT/'artifacts/usability-results.json').write_text(json.dumps(report,indent=2))
 finally:
  browser.close()
  if server:server.shutdown()
raise SystemExit(0 if report['passed'] else 1)
