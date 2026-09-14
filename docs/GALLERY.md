# Watch, then try

Three 12-second clips show actual controls and actual simulation state. The videos use deterministic physics steps and slowed playback, not real-time screen-performance measurements. They are silent, with burned-in English captions, optional WebVTT captions and the transcripts below. No autoplay is used.

## 1. Move a target; recover the pose with FK

<p class="github-preview"><img alt="Actual simulator solving a platform pose from six lengths" src="https://tinmanlab.github.io/stewart_platform/media/01-ik-fk.png"></p>

<video controls preload="none" poster="media/01-ik-fk.png" aria-label="IK and FK demonstration"><source src="media/01-ik-fk.mp4" type="video/mp4"><track kind="captions" src="media/01-ik-fk.vtt" srclang="en" label="English"><a href="media/01-ik-fk.mp4">Download the IK/FK video</a></video>

[Watch/download MP4](https://tinmanlab.github.io/stewart_platform/media/01-ik-fk.mp4) · [Try IK](https://tinmanlab.github.io/stewart_platform/?demo=ik)

**Transcript.** Start at home. Enter X = 25 mm, Z = 575 mm and roll = 4°. Watch the physical platform approach its target. Open **IK · FK**, copy the target lengths and solve FK. A converged solution is applied as a new control target, never as a replacement for the physical state.

**Notice:** inverse kinematics answers “what lengths?”; forward kinematics answers “what pose?”. Local convergence does not prove a unique assembly mode.

## 2. Push a virtual spring

<p class="github-preview"><img alt="Actual 16 N compliance experiment with controls and readouts" src="https://tinmanlab.github.io/stewart_platform/media/02-compliance.png"></p>

<video controls preload="none" poster="media/02-compliance.png" aria-label="Compliance and force-release demonstration"><source src="media/02-compliance.mp4" type="video/mp4"><track kind="captions" src="media/02-compliance.vtt" srclang="en" label="English"><a href="media/02-compliance.mp4">Download the compliance video</a></video>

[Watch/download MP4](https://tinmanlab.github.io/stewart_platform/media/02-compliance.mp4) · [Try compliance](https://tinmanlab.github.io/stewart_platform/?demo=compliance)

**Transcript.** Select the +16 N compliance preset. With K = 800 N/m, predict the settled displacement: 16/800 m = 20 mm. The platform yields under load. Open **Dynamics**, release sustained forces, and observe recovery towards its target.

**Notice:** transient oscillation is not a failure of the equilibrium relation. Compare settled positions with the same force, geometry and actuator limits. A short impulse is a different experiment.

## 3. Motors versus passive springs

<p class="github-preview"><img alt="Actual passive slider inspector with stiffness and damping" src="https://tinmanlab.github.io/stewart_platform/media/03-passive.png"></p>

<video controls preload="none" poster="media/03-passive.png" aria-label="Gravity compensation and passive joint demonstration"><source src="media/03-passive.mp4" type="video/mp4"><track kind="captions" src="media/03-passive.vtt" srclang="en" label="English"><a href="media/03-passive.mp4">Download the passive-joint video</a></video>

[Watch/download MP4](https://tinmanlab.github.io/stewart_platform/media/03-passive.mp4) · [Try passive joints](https://tinmanlab.github.io/stewart_platform/?demo=passive)

**Transcript.** Start with gravity compensation only. Motors support the modelled weight without position PD. Switch all six sliders to passive springs and dampers. Select P1, change its stiffness to 1450 N/m and damping to 55 N·s/m. The resulting response comes from these physical parameters, not a pose animation.

**Notice:** a spring develops force when displaced from its rest length. Changing only P1 breaks symmetry. No motor effort does not mean no joint force.

## Reproduce or make your own

Run `python tools/record_demos.py` after `python build.py`, then `python tools/build_preview.py` for the small README loop; FFmpeg and the pinned Playwright development dependency are required. Each clip is 120 real browser frames at 10 frames/s. A manifest in `artifacts/recordings.json` records the HTML hash, UI steps, measured state and renderer path. Media is rebuilt into the Pages artifact; it is not the authority for physics claims. Numerical tests and source code remain available separately.

For a class, play a clip once, pause, ask for a prediction, then run the corresponding [experiment](EXPERIMENTS.md). Use the written transcripts when video is unavailable. The [validation page](VALIDATION.md) explains exactly which execution paths were tested.
