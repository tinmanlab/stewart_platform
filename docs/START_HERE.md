# Move it. Ask why.

A robot is easier to understand when it has a visible job. Here the job is to keep a rolling ball on a plate while you move its target or give it a push.

<a class="button" href="https://tinmanlab.github.io/stewart_platform/?demo=ball">Play Ball Lab →</a>
<a class="button secondary" href="https://tinmanlab.github.io/stewart_platform/?demo=ik">Explore the mechanism</a>

<video class="hero-video" controls muted preload="none" poster="media/lab-preview.png" aria-label="Ball balance, target following, push and reset"><source src="media/lab-preview.mp4" type="video/mp4"><a href="media/lab-preview.mp4">Open the demonstration video</a></video>

Actual solver recordings, edited for explanation—not a runtime speed benchmark. No account, installation or physical hardware is required.

## First: predict, then touch

Open **Ball Lab**. The orange ball begins off-centre. Press Run if your motion preferences start the experiment paused. Does the plate need to tilt toward or away from the target? Why does it sometimes tilt the other way before the ball arrives?

Click the 3D plate to place a **red goal crosshair** (or use the small top view). Dragging the scene rotates the camera, not the goal. The green trail follows the ball through a fall in three dimensions. Now press **Push the ball**. Try **Ball feedback OFF · level plate** and repeat. The motors still hold a level plate, but the ball-position controller is absent. **Reset tested setup** returns to the reference setup.

## Move between ball and manual control

**Ball Lab / Return to ball control** is always in the header, with a second entry in the inspector tabs. It opens the ball controls and resumes automatic feedback on the existing drive. If the ball fell, it resets the ball and resumes; a numerical stop instead directs you to **Reset tested setup**.

**Tilt the plate manually** switches to IK pose targets without removing the ball or servo. Change roll/pitch in Control. **Manual effort** is different: it pauses first, releases position holding and uses force/torque commands from active joints in Joints. In both cases, return through **Return to ball control**. Merely viewing Joints or Dynamics does not change the running controller.

| Situation | What to do |
|---|---|
| Nothing moves; status says PAUSED | Press Run. Parameter edits do not advance frozen physics. |
| After a fall or control-OFF comparison | Reset ball & balance clears the ball/path/observer, preserving drive and sensor parameters. |
| Numerical stop or an unstable custom experiment | Reset tested setup (Reset lab in the scene) restores the known Ball Lab preset. |
| A greyed-out setting | It is not used by the current mode. Ideal Kp/Kd do not configure the finite servo; delay/noise do not affect Ideal state. |
| Need a fresh classic experiment | Exit to platform workbench and choose one preset. This discards the current ball run; save first. |
| Need to resume an experiment | Use Save project / Load project. Geometry-only JSON is an export, not a project. Imports start paused and clear stale FK results. |

**Ball feedback OFF** requests a level plate while the motors keep running. **Drives off** requests zero motor effort and does not support the plate. They are not interchangeable. A finite servo can have decaying current after a zero-effort request.

Platform CSV records mechanism state and efforts; Ball CSV includes true, measured and predicted ball positions plus drive readouts. The displayed mechanism energy is not total energy of the ball and motor electronics. Sample timing follows actual recorded simulation timestamps.

## Four ways to learn

| Start with a question | Next step |
|---|---|
| Which way should the plate tilt to stop a moving ball? | [Ball Lab controls and vocabulary](BALL_LAB.md) |
| Does twice the stiffness halve a displacement under the same force? | [Repeatable experiments](EXPERIMENTS.md) |
| How do six leg lengths describe a platform pose? | [Kinematics and control equations](THEORY.md) |
| What is simulated, what is sensed, and what was actually verified? | [Code map](CODE_MAP.md) · [Validation](VALIDATION.md) |

No age requirement is implied. Start with the visible motion and continue into the equations when useful.

## Five classic experiments remain

[Move with IK](https://tinmanlab.github.io/stewart_platform/?demo=ik) · [Recover a pose with FK](https://tinmanlab.github.io/stewart_platform/?demo=fk) · [Push a virtual spring](https://tinmanlab.github.io/stewart_platform/?demo=compliance) · [Compensate gravity](https://tinmanlab.github.io/stewart_platform/?demo=gravity) · [Inspect passive joints](https://tinmanlab.github.io/stewart_platform/?demo=passive)

The solid mechanism follows physical forces. The outline marks a target; it is not the actual pose. Passive means motor-off with explicitly selected spring/damper effects—not locked. The ball's blue square is a delivered position measurement, not a camera reconstruction.

## Keep the model's limits visible

This is an educational simulation. Joint housings are procedural presentation geometry, not a manufactured assembly or collision clearance certificate. The sphere uses a custom contact model; real camera sensing and ball–leg collisions are not included. See [Ball Lab assumptions](BALL_LAB.md) and [the original model limits](THEORY.md).
