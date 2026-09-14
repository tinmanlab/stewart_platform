# From equations to executable code

The simulator is plain JavaScript. The numerical core has no renderer dependency and exposes `globalThis.Stewart` in a browser or Node. The English interface and lesson presets reuse this core; they do not contain a second physics implementation.

![Target, controller, effort allocation, forward dynamics and measured-state feedback](media/control-loop.svg)

| Concept | Implementation in [core.js](../src/core.js) | Inspect / test |
|---|---|---|
| Attachment positions and leg lengths | `createGeometry`, `kinematics` | IK → FK round trips |
| Linear / angular body Jacobians | `pointJac`, `kinematics` | Central differences of all 12 columns |
| Local FK | `forwardKinematics` | Residual, initial seed, rejected input |
| Mass and gravity | `massAndGravity` | Symmetry, positive definiteness, potential gradient |
| Velocity coupling | `dynamics` | Contact-free energy identity |
| Passive springs / dampers | `jointRows`, `passiveTau`, `orientationError` | Passive energy gradients and decay |
| Available motor axes | `activeColumns` | 18 joint groups, up to 42 effort components |
| Bounded effort allocation | `allocate` | Saturation and residual, not assumed perfect allocation |
| IK, gravity, compliance demand | `jointRows`, internal `controlDemand` | Tracking, holding and F/K experiments |
| Time integration | `step`, `shift` | Fixed dt, finite states and bounded efforts |
| Inverse dynamics | `inverseDynamics` | External-wrench subtraction; excludes contact stops |
| Save / restore | `snapshot`, `restore` | Round trip and invalid-input rejection |

## A minimal headless experiment

```js
require('../src/core.js');
const S = globalThis.Stewart;
const sim = S.makeSimulation();
sim.settings.mode = 'compliance';
sim.settings.translationK = 800;
sim.settings.external = [16, 0, 0, 0, 0, 0];
for (let i = 0; i < 1500; i++) {
  S.step(sim);
  if (sim.halted) throw new Error(sim.error);
}
console.log('X displacement [mm]:', 1000 * sim.state.p[0]);
```

Run the supplied [example](../examples/compliance.cjs) from the repository with `node examples/compliance.cjs`. Browser users can load the supplied JSON examples through **Load project**, then press **Run**. Imports intentionally open paused.

## Coordinate conventions worth checking

All world wrenches act at the platform reference origin. Quaternion order is `[w,x,y,z]`. The orientation update left-multiplies a world-frame rotation increment. UI roll/pitch/yaw uses `Rz(yaw) Ry(pitch) Rx(roll)`; Euler angles are not integrated as generalized velocities.

The six-row leg Jacobian maps **platform twist to leg speeds**. Therefore `W = J^T f` maps axial leg forces to platform wrench. Some serial-robot texts define the Jacobian in the opposite direction. Read the definition before copying a transpose formula.

The internal state contains `p`, `q`, six `spin` coordinates, twelve generalized speeds `v`, and simulation time `t`. The six spin coordinates capture rotations of the telescoping leg assemblies; their values cannot be inferred from six lengths alone.

## Code ownership

`src/core.js` owns physics and model validation. `src/app.js` owns controls, readouts and recording. `src/renderer.js` owns the WebGL / CPU rendering paths. `src/lessons.js` only selects existing modes and goals. `src/shell.html` and `src/style.css` own the interface. `build.py` assembles the single-file app and projects canonical Markdown into static learning pages.

The original Korean HTML in `archive/ko/` is a frozen release, not a second maintained implementation. Its SHA-256 is checked. New behavior is implemented in the English source; backporting is a separate decision.

## Research extensions, not current capabilities

Cross-engine validation, independent plant/controller parameters, anisotropic spherical stiffness, geometric joint travel limits, contact complementarity, motor electrical dynamics and collision-aware workspace analysis are possible follow-on studies. They are not enabled by a successful screenshot or a passing same-model regression. Keep such claims separate from the current evidence.
