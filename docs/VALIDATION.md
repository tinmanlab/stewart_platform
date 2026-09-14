# Evidence and limitations

A simulation is useful only when its claims fit its evidence. This project checks numerical identities, bounded responses and browser interactions. It has **not** been validated against a physical Stewart platform or an independent multibody engine.

## What the checks cover

| Layer | Reproducible command | What it establishes |
|---|---|---|
| Mechanics | `node tests/core.test.cjs` | IK/FK round trips, finite-difference Jacobians, mass/inertia properties, velocity-bias identity, joint efforts, controller responses and persistence checks on specified fixtures |
| Continuous scenarios | `node tests/endurance.test.cjs` | A 10 s moving-target case and 2 s passive, drives-off and all-active cases remain finite and respect tested bounds |
| Language/archive | `python tests/english.test.py` | Maintained source is English, document language is correct, decompressed Korean archive matches its fixed SHA-256 |
| Browser | `python tests/browser_smoke.py` | Actual controls, joint changes, IK/FK, load/release, JSON download/import, CSV, geometry change, five lesson helpers, reduced motion and narrow-screen layout |
| Teaching media | `python tools/record_demos.py` | Real UI actions and state-dependent observations generate captioned clips, with source hash and execution manifest |
| Website | `python tests/site.test.py` | Built entry points, local links, image alternatives, SVG descriptions, byte binding, caption files and 12 s video durations |

Current implementation status belongs to the [exact commit's Actions checks](https://github.com/tinmanlab/stewart_platform/actions), not a permanently green label in this document. Generated raw results live in CI artifacts or local `artifacts/` and `tests/*-results.json`.

## English v1.1 preparation snapshot

The following is a **dated local evidence snapshot, 2026-09-14**, not a promise that every later commit passes. It used Node 22.16.0, Python 3.13.5 and Chromium 144.0.7559.96. The original mechanics and renderer were retained; the maintained UI was translated and lesson navigation added. The 26 core checks, four continuous scenarios and three language/archive checks passed. The browser interaction suite also passed.

| Selected result | Measured value | Meaning |
|---|---:|---|
| Core IK/FK maximum position error on tested poses | about 5.06e-10 m | Local numerical round trip, not a physical positioning accuracy |
| Core finite-difference body-Jacobian comparison | about 1.14e-10 | Derivative consistency for tested states |
| Core gravity-only hold over 0.5 s | about 1.00e-11 m drift | Gravity cancellation when plant and controller share the same model |
| Core IK tracking after 1.3 s | about 0.149 mm position error | One specified transient, not a universal tracking bound |
| Browser 16 N / 800 N/m, after 1.5 s settling | 19.99947 mm X displacement | Approximately the predicted 20 mm equilibrium |
| Browser after force release, another 1.5 s | 0.0005004 mm X displacement | Recovery in this model and fixture |
| Browser width/scroll width at mobile viewport | 390 / 390 px | No horizontal page overflow in that checked state |
| Browser JavaScript/console errors and app requests | 0 / 0 / 0 | For the local tested interactions, not a claim about hosting logs |

The browser runner used `page.set_content` with the exact built standalone HTML because navigation was restricted in that environment. **CPU Canvas rendering was exercised; GPU/WebGL rendering, real Pages navigation and arbitrary user devices were not established by that test.** Browser timings can vary because ordinary UI interaction allows elapsed simulation time; deterministic core fixtures are the better numerical baseline. The recorded clips use explicitly stepped simulation time and must not be used to infer real-time throughput.

Mechanics source SHA-256 for this preparation snapshot:

```
f2d0375365e133fcc49b7542f393497d06f56aeb6b430c804e464ebccbf085f6
```

The generated `build.json` binds a particular English HTML file and the Korean original to source hashes. `artifacts/recordings.json` separately identifies the HTML used for recordings. These manifests should be inspected alongside the exact CI commit or downloaded package.

## What a pass does not establish

**Physics:** no measured actuator model, friction, backlash, structural flexibility, collision mesh, thermal limit or experimental parameter identification. Rendered fasteners and collars are not separately calibrated inertial parts. Ball-joint actuators are ideal three-axis torque sources, not a purchasable hardware design.

**Kinematics:** local FK does not enumerate all assembly modes or guarantee a unique pose. A conditioning threshold does not prove a globally reachable, collision-free or manufacturable workspace. Internal axial leg spin is not observable from six leg lengths.

**Control:** matching-model gravity cancellation does not prove robustness to unknown payload. A virtual spring/damper and bounded simulation do not prove passivity or stability for all gains, steps, configurations and active-joint sets. The bounded effort allocation is approximate, not a globally optimal constrained solver. Missing actuation cannot be repaired by a label saying “compliance”.

**Numerics:** mass/Jacobian/energy identities test implementation consistency, not independent physical truth. Damped semi-implicit stepping is not an exact integrator; penalty contacts can penetrate. The leg-orientation chart has an excluded singular direction. Energy and convergence studies require explicit trajectories, time steps, tolerances and acceptance criteria.

**Product:** keyboard-reachable controls, captions and numeric alternatives improve access, but there is no full accessibility certification or validated age-specific curriculum. The app makes no simulation-telemetry requests in the checked standalone run; the hosting provider can still keep ordinary access logs.

## Before a stronger claim

For a research comparison, define the experiment, match conventions and inertial parameters in an independent engine, perform time-step refinement, and compare full trajectories, wrenches and energy with explicit tolerances. For physical hardware, independently verify mechanical limits, identification, sensing, timing and fail-safe control. This repository does not authorize or implement that connection.

See the [model](THEORY.md), [equation-to-code map](CODE_MAP.md), [experiment recipes](EXPERIMENTS.md) and [original references](REFERENCES.md).
