# Ball Lab: move a target, not the ball

[Open Ball Lab](https://tinmanlab.github.io/stewart_platform/?demo=ball)

The orange ball is a separate rigid body. A controller changes the platform's roll and pitch targets. The existing six-actuator, force-driven Stewart simulation moves the plate, and contact makes the ball roll. There is no invisible rim, position clamp or force pulling the ball toward its target.

## Play in one minute

Choose **Ball Lab**, then **Balance at center**. Press Run if paused. Click/drag the top-view target or use arrow keys (10 mm steps). Trace a circle, Push the ball, or compare Ball feedback OFF. OFF requests level hold with motors on; it is not Drives off. Try a fall deliberately launches the ball outward near the edge.

Reset ball & balance respawns relative to the current plate, clears the path/observer/measurement queues/trail, and enables ball feedback while preserving drive/sensor parameters. Reset tested setup also restores the reference platform, servo and clock. Exit to platform workbench deliberately starts a fresh classic experiment. Save project first.

Tilt the plate manually releases the pose target to IK controls; Manual effort uses individual active joint commands and starts paused. The automatic ball controller never writes targets in those manual states. Return to ball control (header) or the Ball Lab tab resumes the existing drive; if the ball fell, that action resets it first. Viewing another inspector tab alone does not alter control. See [the operating guide](START_HERE.md) for recovery paths and disabled controls.

Orange denotes true ball position, teal the target, and blue the delivered position measurement, and purple the predicted current position. The inset is coordinate telemetry, **not a camera image**. Its dashed circle is a conservative visual guide, not a wall or a proof of safety.

## Clear deck and actual joint centers

The default attached payload is now zero. The former box was a 2 kg attached load, not an IMU. The optional payload remains available in Design; Ball Lab requires it to be zero.

Top spherical-joint centers remain at the original attachment coordinates. The disk centre is explicitly 62 mm above that plane, so its 28 mm-thick underside is 48 mm above the joint centers. Separate captive balls, hollow sockets and mounting stems occupy this gap rather than appearing buried in the plate. The contact radius and flat cap both use `deckGeometry(g).radius`; the bevel sits outside/below the flat cap. Decorative bracket/fastener geometry is lumped into the entered body masses, not independently weighed CAD geometry.

This coordinate change is mechanical, not only cosmetic. The disk CoM offset enters the mass matrix and gravity through its point Jacobian. The payload height is relative to the disk centre. A historical saved project without `deckOffset` restores the old zero-offset convention instead of silently moving its reference frame. The frozen Korean original is unchanged.

## Physics in compact form

The sphere defaults to mass **0.12 kg**, radius **26 mm**, inertia **I = (2/5) m r²**, and Coulomb coefficient **μ = 0.45**. Its position, velocity, angular velocity and quaternion are independent states. Contact uses the actual simulated plate pose and point velocity, not the commanded pose.

Let n be the plate normal and c = x_ball − r n the contact point. The relative contact velocity is:

```text
v_rel = v_ball + ω_ball × (−r n)
        − [v_platform + ω_platform × (c − p_platform)]
```

A contact impulse P updates both bodies:

```text
Δv_ball = P / m
Δω_ball = (−r n) × P / I
Δu_platform = −M_platform⁻¹ J_pointᵀ P
```

The normal impulse is nonnegative; tangential impulse magnitude is bounded by μ times the normal impulse. Four projected iterations resolve normal/tangent coupling. Small penetration is handled by a velocity bias with coefficient 0.18. A phenomenological angular-loss coefficient (`rollingDrag`, 0.015 s⁻¹ by default) dissipates spin; it is not a measured material model. The platform advances first, followed by sphere/contact impulses: this is a **first-order partitioned educational model**, not MuJoCo or an independently validated general-purpose contact engine.

On a stationary incline, the no-slip reference for a uniform solid sphere is:

```text
a = g sin(θ) / [1 + I/(m r²)] = (5/7) g sin(θ)
```

The reference is tested with a fixed plate and angular loss disabled. It is not substituted for the moving-contact calculation. Once the sphere's projected centre leaves the finite deck, it loses support and falls. Sidewall/rim collision, ball–leg collision, detailed edge contact and elastic deformation are not modeled. The floor provides a simple damped landing.

## Controller and sensing

The outer loop runs at **100 Hz** and commands only roll/pitch; X/Y/Z and yaw targets remain at home. The default interactive preset uses a bounded motor/screw servo, delayed encoders and gyro/FK pose estimation. The **Ideal force comparison** profile is available separately.

```text
a_des = Kp (x_target − x_estimated_now)
        + Kd (v_target − v_estimated) + a_target
roll_des  ≈ −a_des,y / [(5/7) g]
pitch_des ≈  a_des,x / [(5/7) g]
```

The sensor/servo preset uses Kp = 2.5 s⁻², Kd = 2.8 s⁻¹, sampled coordinates at 50 Hz with 40 ms latency and ±0.7 mm bounded noise. An alpha-beta observer updates at capture time and predicts across latency. Missing/stale samples request level hold, without a hidden true-velocity shortcut. Smooth target transitions and a slower circle accommodate the finite drive response.

See [Drive and sensor realism](REALISM.md) for the electrical equations, parameters, fixed-axis ball/socket construction, observer and acceptance metrics. Classic ideal-plant tests remain distinct from the realistic interactive preset. No preset guarantees retention outside its tested envelope.

No camera detector, pressure array, physical webcam or hardware controller is included. A future visual-servoing implementation must detect pixels and calibrate camera-to-plate coordinates; drawing true coordinates in an inset does not establish that capability.

## Repeatable acceptance

Run `node tests/ball.test.cjs` and `node tests/ball_invalid.test.cjs`. The suite checks deck clearance, incline rolling, friction bounds and equal/opposite contact impulses, actual edge fall, centre/target recovery, reset/JSON roundtrip, delayed measurements, five initial offsets and slow circle tracking. Initial-offset tests use stationary launches at (±100,0), (0,±100), and (70,70) mm; they are not a full viability-region search. The slow circle has radius 80 mm and angular speed 0.35 rad/s, with a blended entry.

Run `python tests/ball_browser.py` for controls; add `--url https://tinmanlab.github.io/stewart_platform/` for real hosted navigation. Without `--url` it explicitly reports injected HTML, not a hosted pass. The original numerical and publication tests must continue to pass. JSON/CSV exports are measurements from this model, not hardware evidence.

## Source and references

`src/ball.js` owns contact/control/serialization; `src/ball-ui.js` owns interaction; `src/mechanical-view.js` owns presentation. `src/core.js::deckGeometry` is the shared deck contract; `src/actuator.js` owns the optional drive/encoder/IMU model and its snapshot contract. `build.py` appends those modules at explicit maintained-runtime extension points and never adds them to the frozen archive.

Quanser's **2 DOF Ball Balancer** demonstrates why ball position and nested control are useful teaching examples: https://www.quanser.com/products/2-dof-ball-balancer/ . It is a different mechanism, not a donor engine or validation of this implementation.

MuJoCo's **Computation / Contact** documentation explains unilateral contact, friction cones and the distinction between sliding, torsional and rolling friction: https://mujoco.readthedocs.io/en/latest/computation/ . This implementation is custom and does not claim to reproduce MuJoCo's solver.

Direct Stewart-platform educational precedent: *Commparison Between Different Methods of Control of Ball and Plate System with 6DOF Stewart Platform*, IFAC-PapersOnLine (2015), DOI **10.1016/j.ifacol.2015.09.158**. Educational context: Parga, Yu and Li, *A low-cost ball and plate system for advanced control education* (2015), DOI **10.1177/0020720915591582**. These are references, not claims of reproduced results.
