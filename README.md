# Stewart Platform Lab

**Move a six-legged robot. Push it. See why it moves.**

A free, browser-based 3D lab for parallel-robot kinematics, dynamics and control. No account, install or hardware required.

[**Open the lab →**](https://tinmanlab.github.io/stewart_platform/) · [Learning guide](https://tinmanlab.github.io/stewart_platform/learn/) · [Video walkthroughs](https://tinmanlab.github.io/stewart_platform/learn/GALLERY.html)

<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="https://tinmanlab.github.io/stewart_platform/media/lab-preview.png">
  <img src="https://tinmanlab.github.io/stewart_platform/media/lab-preview.gif" width="960" alt="Actual simulator walkthrough: six actuators move a target, the platform yields to a 16-newton force, then passive springs replace motor commands.">
</picture>

*Real solver recordings, edited into a short loop—not a speed benchmark. [Still image](https://tinmanlab.github.io/stewart_platform/media/lab-preview.png) · [Pauseable video](https://tinmanlab.github.io/stewart_platform/learn/index.html). GitHub may suppress animation according to your motion preferences.*

## Try a question, not a setup process

| One click | What to do | What you discover |
|---|---|---|
| [**Move the platform**](https://tinmanlab.github.io/stewart_platform/?demo=ik) | Try the opposite tilt. | IK converts a pose into six lengths; PD applies real forces. |
| [**Solve forward kinematics**](https://tinmanlab.github.io/stewart_platform/?demo=fk) | Inspect the computed pose and residual. | Six lengths reconstruct a local assembly pose. |
| [**Push and release**](https://tinmanlab.github.io/stewart_platform/?demo=compliance) | Apply 16 N, then release with one button. | At K = 800 N/m, the settled displacement is about 20 mm. |
| [**Compensate gravity**](https://tinmanlab.github.io/stewart_platform/?demo=gravity) | Push the weight-supported platform. | Cancelling weight is not position control. |
| [**Try passive joints**](https://tinmanlab.github.io/stewart_platform/?demo=passive) | Change P1 stiffness and damping. | No motor does not mean no spring force. |

Each example resets the reference configuration. Save a custom project first. Drag to orbit, scroll to zoom, **Space** to pause. All five experiments are also at the top of the simulator's settings panel.

## What this helps you do

**Learn by changing one variable.** Predict an outcome, change a gain or force, inspect the response, then export CSV measurements. Save and reload a complete project as JSON.

**Explore a parallel mechanism.** Edit dimensions and mass; inspect all **18 active/passive joint groups**; compare IK/PD, gravity compensation, impedance, manual effort and drives-off modes. Passive stiffness/damping and motor effort limits remain explicit.

**Connect explanation to implementation.** Follow each equation into its function and regression test, rather than treating a moving picture as physical validation.

![Six-SPS mechanism and the difference between target, controller and physical motion](docs/media/anatomy.svg)

## Start simple; go as deep as needed

| Your question | Read next |
|---|---|
| **Explore:** Which legs make the table nod? No mathematics required. | [First experiment and vocabulary](docs/START_HERE.md) |
| **Measure:** Does doubling stiffness halve displacement? | [Four repeatable experiments](docs/EXPERIMENTS.md) |
| **Model:** How do geometry, Jacobians and feedback fit together? | [Equations and control algorithms](docs/THEORY.md) |
| **Investigate:** What do internal spins, allocation and numerical tests establish? | [Code map](docs/CODE_MAP.md) · [Validation](docs/VALIDATION.md) · [References](docs/REFERENCES.md) |

## Scope, without the fine print

Educational custom rigid-body simulation, **not hardware-validated engineering software**. No self-collision, friction, backlash, flexible links, motor electronics or realistic ball-joint limits. FK is local; active ball joints are ideal torque sources. A geometry check is not a manufacturing or safety certificate. No physical motors are connected.

## Run locally or contribute

```sh
python build.py                       # standard library only
# Open site/index.html: the simulator works offline.
```

For the complete learning site, tests and media generation, follow [Contributing](CONTRIBUTING.md). `src/` and `docs/` are source; `site/` is generated. The [Korean original](archive/ko/README.md) is frozen and checksum-guarded.

Pull requests run numerical, browser, link and media checks. A deployment is followed by **real hosted navigation, asset-hash and interaction tests**; see [publishing](docs/PUBLISHING.md). These checks reduce regressions, not guarantee zero outages.

MIT · [Cite this software](CITATION.cff) · [Report a problem](https://github.com/tinmanlab/stewart_platform/issues/new/choose)
