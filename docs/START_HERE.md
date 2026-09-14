# Six legs. One curious mind.

A Stewart platform is a moving table supported by six changing-length legs. Move a slider, watch the table respond, then discover the mathematics behind it. Start with the pictures; equations can wait.

<a class="button" href="https://tinmanlab.github.io/stewart_platform/?demo=ik">Open the interactive lab</a> <a class="button" href="GALLERY.md">Watch three short demos</a>

![A moving platform, six telescoping legs and three translations plus three rotations](media/anatomy.svg)

## Your first three minutes

Open the lab and press **Reset**. In **Control**, change **Z** from 550 to 575 mm. The motors extend the legs and raise the table. Next set **Roll** to 4 degrees. Notice that the legs no longer have equal lengths. Press **Pause** to look closely; **Reset** is always available.

The **target** is where you asked the table to go. The **actual pose** is where physics has taken it. A motor pushes or pulls; it does not magically put the table in the right place. The two poses need not match instantly.

Drag the scene to look around. Scroll to zoom. Use the numbered **B/P/T buttons** in **Joints** to inspect the same joints without clicking small objects in the scene. Numeric fields, sliders, buttons and tabs can be reached with the keyboard. The 3D canvas is supplemented by numeric readouts; this is not a complete nonvisual robotics interface.

## Choose your depth

<div class="cards">
<div class="card"><div class="kicker">Explore · elementary</div><h3>Can you make the table nod?</h3><p>Try up/down, tipping left/right and turning. Predict which legs get longer before moving a slider. No equations required.</p><a href="EXPERIMENTS.md">Try experiment 1 →</a></div>
<div class="card"><div class="kicker">Measure · middle / high school</div><h3>How soft is a robot?</h3><p>Push with 16 N. Measure how far it moves. Double the stiffness and predict the new distance.</p><a href="EXPERIMENTS.md">Try experiment 2 →</a></div>
<div class="card"><div class="kicker">Model · undergraduate</div><h3>Turn geometry into control</h3><p>Follow a leg vector from its fixed base to its moving attachment. Connect lengths, the Jacobian, motor forces and feedback.</p><a href="THEORY.md">Read the equations →</a></div>
<div class="card"><div class="kicker">Investigate · graduate</div><h3>Challenge the model</h3><p>Audit the 12-speed dynamics, internal leg spin, virtual work, allocation limits and numerical convergence. Passing a regression is not independent physical validation.</p><a href="CODE_MAP.md">Trace equations into code →</a></div>
</div>

## Six ways to move

**X, Y, Z** move the whole table without intentionally turning it. **Roll, pitch, yaw** turn it about three axes. These six independent motion coordinates are called six *degrees of freedom*. Inside the solver, six additional leg-spin speeds account for the rotation of the telescoping assemblies; the table still has six pose freedoms.

![Three translations and three rotations, shown separately](media/six-motions.svg)

A **joint** is a connection that permits a particular motion. This model repeats **S–P–S** six times: a spherical (ball) joint, a prismatic (sliding) joint and another ball joint. The usual starting setup drives the six sliders and leaves the ball joints passive. The historical platform concept is discussed in [reference 1](REFERENCES.md).

## A small vocabulary

| Word | Everyday explanation | In this lab |
|---|---|---|
| Pose | Where something is, and which way it faces | X/Y/Z plus roll/pitch/yaw |
| IK | Work backwards from where the table should go | Target pose → six leg lengths |
| FK | Reconstruct the table from the legs | Six lengths → one locally solved pose |
| Active | A motor can push or turn | Controller or manual effort |
| Passive | No motor command at this joint | A spring and damper may still act |
| Stiffness | How strongly a spring resists displacement | N/m for a slider; N·m/rad for rotation |
| Damping | Resistance to motion, like a shock absorber | More damping usually reduces oscillation |
| Compliance | Willingness to yield under force | Lower stiffness means a softer response |
| Gravity compensation | Motor effort that counters modelled weight | Not the same as holding a position |

**Passive does not mean locked.** A passive joint with zero stiffness and zero damping is free, not fixed. The geometry still connects the parts. Similarly, **Drives off** does not turn off gravity or passive springs.

## Save something you can explain

Use **Save project** to download a JSON file containing the geometry, states, target, gains and joint settings. Load it later; imported projects open paused. Use **Export CSV** for sampled measurements. Record the experiment, parameter change, prediction, observation and one limitation. Never put personal information in a public issue or a project filename.

The standalone simulator requires no account, server or installation. A local copy runs without internet. The learning pages, videos and source links are separate resources. If your browser requests reduced motion, the English app starts paused; press **Run** when ready.

## A useful model, not a real machine

This lab is for exploring kinematics and control. It does not include self-collision, friction, backlash, flexible links, realistic motor electronics or hardware safety. It does not command physical motors. Geometry checks are not proof that a design can be manufactured. Read [what was tested](VALIDATION.md) before using the results in a report.

Next: [Four experiments](EXPERIMENTS.md) · [Video gallery](GALLERY.md) · [Equations](THEORY.md).
