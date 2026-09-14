// Supplemental bounded-run scenarios. Not a lifetime/reliability certification.
const fs = require('node:fs');
const assert = require('node:assert/strict');
require('../src/core.js');
const S = globalThis.Stewart;
const results = {};
for (const mode of ['trajectory', 'passive', 'drives_off', 'all_active']) {
  const sim = S.makeSimulation();
  const steps = mode === 'trajectory' ? 10000 : 2000;
  let peakV = 0, peakF = 0;
  if (mode === 'passive') {
    sim.settings.mode = 'free';
    for (const j of sim.joints) j.slider.mode = 'passive';
  }
  if (mode === 'drives_off') sim.settings.mode = 'free';
  if (mode === 'all_active') {
    for (const j of sim.joints) { j.base.mode = 'active'; j.top.mode = 'active'; }
    sim.target.p = [.01, -.01, .565];
    sim.target.q = S.qEuler(.02, .02, .02);
  }
  for (let i = 0; i < steps; i++) {
    if (mode === 'trajectory') {
      const t = sim.state.t;
      sim.target.p = [.035*Math.sin(.7*t), .025*Math.sin(.5*t), sim.g.homeZ+.02*Math.sin(.8*t)];
      sim.target.q = S.qEuler(.07*Math.sin(.9*t), .07*Math.sin(.7*t), .1*Math.sin(.5*t));
    }
    S.step(sim);
    assert.ok(!sim.halted, `${mode}: ${sim.error}`);
    peakV = Math.max(peakV, S.norm(sim.state.v.slice(0, 3)));
    peakF = Math.max(peakF, ...Object.entries(sim.last.forces)
      .filter(([id]) => id.includes(':slider:')).map(([, v]) => Math.abs(v)));
  }
  if (mode === 'drives_off') assert.equal(peakF, 0);
  if (mode === 'all_active') assert.ok(S.norm(S.sub(sim.state.p, sim.target.p)) < .001);
  results[mode] = {passed: true, seconds: sim.state.t, final_position_m: sim.state.p,
    peak_linear_speed_m_s: peakV, peak_prismatic_effort_N: peakF};
}
fs.writeFileSync(__dirname + '/endurance-results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
