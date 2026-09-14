# Stewart Platform Lab

**Roll a ball by moving six robot legs. Keep it on the plate.**

A free browser-based lab for parallel-robot kinematics, dynamics and control. No installation, account or physical hardware connection.

[**Play Ball Lab →**](https://tinmanlab.github.io/stewart_platform/?demo=ball) · [Learn by experimenting](https://tinmanlab.github.io/stewart_platform/learn/) · [Short walkthroughs](https://tinmanlab.github.io/stewart_platform/learn/GALLERY.html)

<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="https://tinmanlab.github.io/stewart_platform/media/lab-preview.png">
  <img src="https://tinmanlab.github.io/stewart_platform/media/lab-preview.gif" width="960" alt="Actual simulator walkthrough: a Stewart platform balances a rolling ball, follows a target, recovers from a push and resets.">
</picture>

*Actual solver recordings, edited for explanation—not a speed benchmark. [Still](https://tinmanlab.github.io/stewart_platform/media/lab-preview.png) · [Pauseable video](https://tinmanlab.github.io/stewart_platform/learn/index.html). Motion preferences may suppress automatic animation.*

## Play first

**Move the target**, not the ball. Click the top view, trace a circle, give the sphere a push, then compare control ON/OFF. The controller tilts the force-driven mechanism; contact makes the ball roll. Falling is real within the model, with visible **Reset ball** and **Reset all** controls. The top view is telemetry, not a camera.

[Ball physics, sensing and controls](docs/BALL_LAB.md)

## Try one idea at a time

| Experiment | What changes | What to notice |
|---|---|---|
| [**Ball balance**](https://tinmanlab.github.io/stewart_platform/?demo=ball) | Target, push, control and sensor delay | Position feedback must brake the ball before it reaches the target. |
| [**IK**](https://tinmanlab.github.io/stewart_platform/?demo=ik) | Desired platform pose | Six lengths change together; motors move the actual plate. |
| [**FK**](https://tinmanlab.github.io/stewart_platform/?demo=fk) | Six leg lengths | The solver recovers a local assembly pose, not a force command. |
| [**Compliance**](https://tinmanlab.github.io/stewart_platform/?demo=compliance) | Force and stiffness | The same push produces different deflections. |
| [**Gravity**](https://tinmanlab.github.io/stewart_platform/?demo=gravity) | Compensation and disturbances | Supporting weight is not the same as holding a position. |
| [**Passive joints**](https://tinmanlab.github.io/stewart_platform/?demo=passive) | Stiffness and damping | A motor-off joint can still exert spring and damping forces. |

Examples restore a known setup; save custom work first. Drag the 3D scene to orbit, scroll to zoom, and use Space to pause. Ball targets are selected in the separate top view.

## Look inside when you are ready

Inspect **18 active/passive joint groups**, edit geometry/mass and effort limits, apply disturbances, save projects as JSON and export measurements as CSV. The clear deck now sits above distinct bearing housings and mounting brackets; the old centre box is an optional payload, not a sensor.

![Six-SPS mechanism and the difference between target, controller and physical motion](docs/media/anatomy.svg)

[First experiment](docs/START_HERE.md) · [Experiments](docs/EXPERIMENTS.md) · [Equations](docs/THEORY.md) · [Code map](docs/CODE_MAP.md) · [Tests and limits](docs/VALIDATION.md) · [References](docs/REFERENCES.md)

## What is actually being simulated?

The Ball Lab defaults to a **24 V motor/screw servo with sampled encoders, gyro/FK pose estimation and delayed ball-position measurements**. Change the speed/current limits and compare with the ideal force profile. Passive ends are captive ball/socket joints, not pin hinges. [Drive, sensor and socket assumptions](docs/REALISM.md) are explicit: this is an educational model, not calibrated hardware.

## Scope

Educational rigid-body simulation, **not hardware-validated engineering software**. Ball contact is a first-order custom impulse model; its sampled sensor is not visual servoing. No general self-collision, certified bearing travel, switching/thermal electronics, flexible links or manufacturing certification. Retention is demonstrated only for stated test conditions, not guaranteed for arbitrary launches or sensor failures.

## Run or contribute

```sh
python build.py                 # standard library only; open site/index.html
node tests/ball.test.cjs        # new contact and control regressions
```

Use [Contributing](CONTRIBUTING.md) for the full learning site and tests. The [development plan](docs/development/BALL_LAB_PLAN.md) bounds the new feature. The [Korean original](archive/ko/README.md) is checksum-guarded and unchanged.

PRs run numerical and browser tests. Public deployment has a separate hosted navigation/hash/interaction check; a build is not proof of public operation. These checks reduce regressions, not guarantee zero outages.

MIT · [Cite](CITATION.cff) · [Report a problem](https://github.com/tinmanlab/stewart_platform/issues/new/choose)
