# Ball-on-plate and mechanical presentation — implementation plan

Goal: a playable, browser-only ball experiment on a clear, credible six-SPS platform; retain the five existing lessons and the immutable Korean original.

Approved specification: tinmanlab/stewart_platform issue #8 and the owner's subsequent approval of clean joint mounts, direct implementation and branch cleanup. Repository files own implementation/model contracts. This file describes execution; live status belongs to the PR/issue, not this plan.

## Structure and acceptance

1. `src/core.js`: define `deckGeometry(g)` and an explicit deck-center offset above the unchanged top-joint centers. Include this offset in disk and optional payload mass Jacobians and floor tests. Default attached payload becomes zero; legacy saved geometry without an offset restores its original zero offset. Test mass/potential consistency, existing numerical regressions and deck/joint clearance.
2. `src/ball.js`: finite-radius sphere state, unilateral finite-deck point contact, Coulomb tangential impulses and equal/opposite generalized platform impulses. Ball gravity and angular velocity are integrated; do not add the ball to attached payload. Fall transitions remain physical (no walls/clamping). Outer position/velocity PD creates bounded, rate-limited roll/pitch targets for the existing motor-force plant. Ideal and sampled/delayed/noisy measurement paths remain named separately from vision. Snapshot/reset queues and estimator state are explicit.
3. `src/mechanical-view.js`: reusable procedural annular spherical-bearing housings, separated mounting ears and through pins, clear elevated deck and chamfered rims. These are presentation geometry, not collision certification. All centers match the solver; added visual details are lumped into the entered body masses.
4. `src/ball-ui.js`: balance/click-target/circle/manual comparison, disturbance, fall and reset controls, a truth-labelled top-view target input, trail, measured-versus-true position and small live diagnostics. Preserve existing global shortcuts, lessons and import/export. The top view is not a camera.
5. `tests/ball.test.cjs`: first run must fail before source implementation. Check stationary rolling reference, friction bounds, moving contact, reaction impulses, edge/fall, deterministic reset, sampled-measurement timing, snapshot invalid input, initial-state retention, target/circle tracking and controller-disabled counterexample.
6. `tests/ball_browser.py`: actual buttons, point selection, reset, contact loss, lesson switching and persistence. Record whether execution used HTTP or injected HTML. Do not present one as the other.
7. `tools/record_demos.py`: record actual solver states for a ball hero, separate IK/FK input directions and a stiff/soft force comparison. Produce GIF plus captioned MP4/WebM without idle screen holds. Publish real values, not invented movement.
8. Docs: concise usage, model equations/limits, repeatable examples, primary references, visual/physics distinctions and package entry instructions. Updated README leads with Ball Lab while retaining existing entry URLs.
9. Integrate on a focused feature PR after exact-head tests. Refresh merged branches and dependent open PRs before deleting only completed feature branches via an authorized native capability; never expand credentials or perform unreviewed dependency merges.

## Commands

```sh
node tests/ball.test.cjs
node tests/core.test.cjs
node tests/endurance.test.cjs
python tests/english.test.py
python build.py --site
python tests/ball_browser.py
python tests/hosted_smoke.py
```

## Claim boundary

This adds an educational, first-order partitioned rigid-body contact model, not a certified contact solver or full collision engine. Bound retention claims to the tested initial states, gains, timestep and disturbances. Do not claim visual servoing without pixel detection. Do not silently bypass the sampled sensor with truth-state feedback. Physical webcam/device control and load-cell inference are subsequent, separately admitted work.
