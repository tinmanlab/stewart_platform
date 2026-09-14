"""Actual pointer/keyboard journeys for deck picking, startup view and world trails.

CI uses HTTP and the public Pages URL. --injected is a labelled restricted-runner
fallback, never represented as a successful hosted-navigation test.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import argparse, json, os, shutil, threading, unittest
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url');parser.add_argument('--injected',action='store_true');parser.add_argument('--cpu',action='store_true')
args=parser.parse_args();server=None
report={'navigation':'injected HTML' if args.injected else 'HTTP','page_errors':[],'force_cpu':args.cpu}
if not args.url and not args.injected:
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start();args.url=f'http://127.0.0.1:{server.server_port}/site/'
class Journeys(unittest.TestCase):
 def setUp(self):
  self.p=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=2,reduced_motion='reduce')
  self.p.on('pageerror',lambda e:report['page_errors'].append(str(e)));self.p.set_default_timeout(5000)
  if args.injected:
   self.p.set_content((ROOT/'site/index.html').read_text(),wait_until='load');self.p.wait_for_function('window.__stewartReady');self.p.evaluate('lab.startBall()')
  else:self.assertEqual(self.p.goto(args.url.rstrip('/')+'/?demo=ball',wait_until='load',timeout=45000).status,200)
  self.p.wait_for_function('window.__stewartReady && !!lab.sim.ball');self.p.evaluate('lab.running=false')
 def tearDown(self):self.p.close()
 def click_deck(self,xy):
  pos=self.p.evaluate('xy=>{lab.renderer.lastRendered=null;lab.renderer.render(lab.sim,null);const s=lab.sim.state,d=Stewart.deckGeometry(lab.sim.g),w=Stewart.add(s.p,Stewart.rotate(s.q,[...xy,d.top]));return lab.renderer.project(w);}',xy)
  rect=self.p.locator('#scene').bounding_box();self.p.mouse.click(rect['x']+pos[0],rect['y']+pos[1]);return pos
 def test_startup_view_matches_reference_and_home_restores_it(self):
  p=self.p;camera=p.evaluate('({az:lab.renderer.azimuth,el:lab.renderer.elevation,d:lab.renderer.distance,target:lab.renderer.target})')
  self.assertAlmostEqual(camera['az'],-1.34);self.assertAlmostEqual(camera['el'],.52);self.assertAlmostEqual(camera['d'],1.98)
  self.assertEqual(camera['target'],[0,0,.34]);self.assertEqual(p.evaluate('lab.sim.state.t'),0)
  p.evaluate('lab.renderer.azimuth+=1;lab.renderer.distance=3');p.click('#cameraHome')
  self.assertAlmostEqual(p.evaluate('lab.renderer.azimuth'),-1.34)
 def test_click_on_tilted_deck_sets_goal_without_teleport_or_camera_drift(self):
  p=self.p;p.evaluate('lab.sim.state.q=Stewart.qEuler(.08,-.06,.12);window.before=JSON.stringify(lab.sim.ball.p);window.beforeAz=lab.renderer.azimuth')
  self.click_deck([.075,-.045]);goal=p.evaluate('lab.sim.ball.goal')
  self.assertAlmostEqual(goal[0],.075,places=4);self.assertAlmostEqual(goal[1],-.045,places=4)
  self.assertTrue(p.evaluate('JSON.stringify(lab.sim.ball.p)===before'));self.assertTrue(p.evaluate('lab.renderer.azimuth===beforeAz'))
  p.screenshot(path=str(ROOT/'artifacts/deck-click.png'))
 def test_marker_shows_accepted_goal_immediately_when_paused_and_respects_toggle(self):
  p=self.p;self.assertEqual(p.evaluate('typeof lab.renderer.crosshair'),'function')
  p.evaluate('window.marker=[];const old=lab.renderer.crosshair;lab.renderer.crosshair=function(...args){marker.push(args);return old.apply(this,args);};void 0')
  self.click_deck([.07,.04])
  # No forced cache invalidation after the click: await the normal paused render.
  p.wait_for_function('marker.some(m=>Math.abs(m[0][0]-.07)<.0001&&Math.abs(m[0][1]-.04)<.0001)')
  m=p.evaluate('marker.filter(m=>Math.abs(m[0][0]-.07)<.0001&&Math.abs(m[0][1]-.04)<.0001).at(-1)')
  self.assertEqual(m[3],0xd63535)
  self.assertEqual(p.evaluate('lab.sim.ball.target'),[0,0],'Reference must still be governed, not teleported')
  p.click('#ghostToggle');self.assertEqual(p.evaluate('marker=[];lab.renderer.lastRendered=null;lab.renderer.render(lab.sim,null);marker.length'),0)
 def test_orbit_drag_cancellation_and_background_click_do_not_retarget(self):
  p=self.p;self.click_deck([.07,0]);goal=p.evaluate('lab.sim.ball.goal');rect=p.locator('#scene').bounding_box()
  x=rect['x']+rect['width']*.5;y=rect['y']+rect['height']*.6
  p.mouse.move(x,y);p.mouse.down();p.mouse.move(x+85,y+20,steps=5);p.mouse.up();self.assertEqual(p.evaluate('lab.sim.ball.goal'),goal)
  self.assertNotEqual(p.evaluate('lab.renderer.azimuth'),-1.34)
  p.locator('#scene').dispatch_event('pointercancel',{'pointerId':1});p.mouse.click(rect['x']+20,rect['y']+rect['height']*.7)
  self.assertEqual(p.evaluate('lab.sim.ball.goal'),goal)
 def test_top_view_keyboard_goal_bounds_and_manual_pose_return_still_work(self):
  p=self.p;p.locator('#ballTop').focus();p.keyboard.press('ArrowRight');self.assertAlmostEqual(p.evaluate('lab.sim.ball.goal[0]'),.01)
  p.evaluate('StewartBall.setTarget(lab.sim,[0,0])');radius=p.evaluate('Stewart.deckGeometry(lab.sim.g).radius');self.click_deck([radius-.005,0])
  self.assertLess(p.evaluate('lab.sim.ball.goal[0]'),radius-.005)
  p.click('#ballPose');p.locator('#pose3').focus();p.keyboard.press('ArrowRight')
  self.assertFalse(p.evaluate('lab.sim.ball.settings.control'));manual=p.evaluate('JSON.stringify(lab.sim.target.q)')
  p.evaluate('lab.runFor(.02)');self.assertEqual(p.evaluate('JSON.stringify(lab.sim.target.q)'),manual)
  p.click('#ballHome');self.assertTrue(p.evaluate('lab.sim.ball.settings.control'));self.assertTrue(p.evaluate('!!lab.sim.actuator'))
 def test_world_trail_is_used_by_renderer_through_fall_and_project_restore(self):
  p=self.p;p.select_option('#ballDrive','ideal');p.click('#ballFall');p.evaluate('lab.runFor(.8)')
  points=p.evaluate('lab.sim.ball.trail');self.assertTrue(all(len(v)==3 for v in points))
  self.assertGreater(max(v[2] for v in points)-min(v[2] for v in points),.4)
  p.evaluate('window.lines=[];const old=lab.renderer.segment;lab.renderer.segment=function(a,b,r,c,...rest){if(c===0x6fa7a4)lines.push([a,b]);return old.call(this,a,b,r,c,...rest);};lab.renderer.lastRendered=null;lab.renderer.render(lab.sim,null)')
  lines=p.evaluate('lines');self.assertEqual(lines[0],[points[0],points[1]]);self.assertEqual(lines[-1][1],p.evaluate('lab.sim.ball.p'))
  p.screenshot(path=str(ROOT/'artifacts/world-trail-fall.png'))
  saved=p.evaluate('JSON.stringify(Stewart.snapshot(lab.sim))');p.set_input_files('#projectFile',{'name':'world-trail.json','mimeType':'application/json','buffer':saved.encode()})
  self.assertEqual(p.evaluate('lab.sim.ball.trail'),points);p.click('#ballReset');self.assertEqual(p.evaluate('lab.sim.ball.trail.length'),0)
 def test_mobile_picking_maps_css_pixels_not_canvas_backing_pixels(self):
  p=self.p;p.set_viewport_size({'width':390,'height':844});p.locator('#scene').scroll_into_view_if_needed();self.click_deck([-.055,.02])
  goal=p.evaluate('lab.sim.ball.goal');self.assertAlmostEqual(goal[0],-.055,places=3);self.assertAlmostEqual(goal[1],.02,places=3)
  self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),392)
  p.screenshot(path=str(ROOT/'artifacts/target-mobile.png'),full_page=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage']+(['--disable-webgl'] if args.cpu else []))
 (ROOT/'artifacts').mkdir(exist_ok=True)
 try:
  result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Journeys))
  report.update(passed=result.wasSuccessful() and not report['page_errors'],run=result.testsRun,failures=[str(t)+': '+s for t,s in result.failures+result.errors],browser=browser.version)
  (ROOT/'artifacts'/('target-trail-cpu.json' if args.cpu else 'target-trail-browser.json')).write_text(json.dumps(report,indent=2))
 finally:
  browser.close()
  if server:server.shutdown()
raise SystemExit(0 if report['passed'] else 1)
