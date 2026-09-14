// A minimal headless experiment: N / (N/m) = m at settled equilibrium.
'use strict';
require('../src/core.js');
const assert = require('node:assert/strict');
const S = globalThis.Stewart;
const sim = S.makeSimulation();
sim.settings.mode = 'compliance';
sim.settings.translationK = 800;
sim.settings.external = [16, 0, 0, 0, 0, 0];
for (let i = 0; i < 1500; i++) S.step(sim);
assert.equal(sim.halted, false, sim.error || 'Unexpected solver halt');
assert.ok(Math.abs(sim.state.p[0] - 16 / 800) < 0.001);
console.log({force_N: 16, stiffness_N_per_m: 800,
  predicted_displacement_mm: 20, simulated_displacement_mm: sim.state.p[0] * 1000});
