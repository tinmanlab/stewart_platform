# Move it. Ask why.

A Stewart platform is a table supported by six telescoping legs. Change a target, watch the motors respond, and learn one idea at a time. You do not need an equation to begin.

<a class="button" href="https://tinmanlab.github.io/stewart_platform/?demo=ik">Move the robot</a> <a class="button secondary" href="GALLERY.md">Watch a demonstration</a>

<video class="hero-video" controls muted loop playsinline preload="metadata" poster="media/lab-preview.png" aria-label="Overview of movement, compliance and passive-joint experiments"><source src="media/lab-preview.mp4" type="video/mp4"><a href="https://tinmanlab.github.io/stewart_platform/media/lab-preview.mp4">Watch the overview</a></video>

Actual solver recordings, edited for explanation—not a real-time performance measurement. The video has on-screen explanations and does not start automatically.

## Your first minute

Open **Move**. The outline is the target; the solid platform is the physical result. Press **Try the opposite tilt**. Before it settles, predict which legs will become longer. The controller applies forces instead of teleporting the platform.

Drag to look around. Scroll to zoom. **Space** pauses. **Reset** recovers the simulation. All examples reset geometry, gains and joint settings, so save a custom project first. With reduced motion enabled, press **Run** when ready.

## Five questions you can test

| Question | Open | Observe |
|---|---|---|
| How do six motors cooperate? | [Move](https://tinmanlab.github.io/stewart_platform/?demo=ik) | A pose target becomes six desired lengths. |
| Can lengths reveal a pose? | [Solve FK](https://tinmanlab.github.io/stewart_platform/?demo=fk) | A solved pose and a small residual, not a lookup animation. |
| Can a robot feel soft? | [Push](https://tinmanlab.github.io/stewart_platform/?demo=compliance) | 16 N produces about 20 mm at K = 800 N/m; release to recover. |
| Is supporting weight enough? | [Gravity](https://tinmanlab.github.io/stewart_platform/?demo=gravity) | Push once. Weight compensation does not restore position. |
| Does motor-off mean force-free? | [Passive](https://tinmanlab.github.io/stewart_platform/?demo=passive) | Springs and dampers still act. Inspect P1. |

## Read the mechanism

![Two plates joined by six spherical-prismatic-spherical chains](media/anatomy.svg)

**S–P–S** means ball joint → sliding joint → ball joint. Each leg repeats this pattern. Normally the six sliders are active and the twelve ball joints are passive. **Passive is not locked:** zero stiffness and damping make a passive joint free.

![Translations X Y Z and rotations roll pitch yaw](media/six-motions.svg)

**Pose** means position and orientation. **IK** converts a target pose to lengths. **FK** reconstructs one local pose from lengths. **Stiffness** resists displacement; **damping** resists velocity. **Compliance** means yielding under force.

## Choose your depth

**Explore, roughly elementary level:** make the table nod; predict leg motion. **Measure, secondary-school level:** double stiffness and compare settled displacement. **Model, undergraduate level:** connect vectors, the Jacobian and feedback. **Investigate, graduate level:** audit the mass matrix, internal leg spins, force allocation and numerical limits. These are starting points, not prerequisites or a validated age-based curriculum.

[Experiments](EXPERIMENTS.md) → [Equations](THEORY.md) → [Code map](CODE_MAP.md) → [Evidence and limits](VALIDATION.md).

## Keep evidence of what you learned

**Save project** stores geometry, states, gains and joint settings. **Load project** opens it paused. **Export CSV** downloads measurements. Write down your prediction, changed parameter, observation and one limitation.

This is an educational simulation, not a hardware safety or manufacturing certificate. It omits friction, backlash, self-collision and flexible-link effects. Numeric controls and readouts supplement the canvas, but this is not a complete nonvisual robotics interface.
