# Move it. Ask why.

A robot is easier to understand when it has a visible job. Here the job is to keep a rolling ball on a plate while you move its target or give it a push.

<a class="button" href="https://tinmanlab.github.io/stewart_platform/?demo=ball">Play Ball Lab →</a>
<a class="button secondary" href="https://tinmanlab.github.io/stewart_platform/?demo=ik">Explore the mechanism</a>

<video class="hero-video" controls muted preload="none" poster="media/lab-preview.png" aria-label="Ball balance, target following, push and reset"><source src="media/lab-preview.mp4" type="video/mp4"><a href="media/lab-preview.mp4">Open the demonstration video</a></video>

Actual solver recordings, edited for explanation—not a runtime speed benchmark. No account, installation or physical hardware is required.

## First: predict, then touch

Open **Ball Lab**. The orange ball begins off-centre. Press Run if your motion preferences start the experiment paused. Does the plate need to tilt toward or away from the target? Why does it sometimes tilt the other way before the ball arrives?

Click the top-view target. Now press **Push the ball**. Try **Compare: control OFF** and repeat. The motors still hold a level plate, but the ball-position controller is absent. **Reset all** returns to the reference setup.

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
