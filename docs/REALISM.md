# From ideal forces to a sensed electromechanical servo

[Play the sensor/servo preset](https://tinmanlab.github.io/stewart_platform/?demo=ball)

The Ball Lab now defaults to a **generic 24 V motor/screw servo plus sampled position sensing**. Classic lessons keep their explicitly ideal force source. The drive selector resets the experiment, so an ideal run is not silently compared with a partly initialized electrical model.

## What to try

Move the target, push the ball, and open **Drive and sensor parameters**. Watch current, actual leg speed, measurement age, and encoder/FK validity. Reduce the speed/current limit or increase the position-sensor delay. A controller tuned for a fast ideal plant can fail on a slower drive; falling is not hidden. Reset all restores the tested preset. Save project preserves current, encoder queues, estimated pose, observer state and target-transition phase.

Blue squares are delivered measurements. Purple diamonds are predicted positions at the current simulation time. Neither overlay is a camera image.

## Ball and socket, not a pin through a sphere

Each passive end now has a **hollow spherical socket fixed to its parent plate** and a separate captive ball/neck attached to the actuator. There is no through-pin. The opening axis is set by the reference assembly; it does not rotate artificially to follow the leg. At the upper end, the socket opens down toward the actuator and its back attaches under the deck. The ball remains centered on the original solver joint center.

The generated shell has an 18 mm ball radius, an 18.3 mm inner radius, a 24 mm outside radius, a 60° mouth half-angle and a 4.5 mm neck. The mouth is narrower than the ball diameter; the neck has angular clearance within the nominal 0.52 rad cone. The same fixed axes and cone limit are used in target feasibility and restoring travel-stop torques. The restoring cone stop is an assumed internal travel limit, not a mesh-level neck/cup collision solution. Twist remains free. Spring/damper settings are still independent of motor enable.

These dimensions are **our illustrative geometry**, not a reproduction or certification of a purchased joint. Added mounting details remain included in the entered lumped masses. Socket stress, lubrication, manufacturing tolerances and full assembly collision are not solved. An active spherical joint remains an explicitly ideal torque source, not a hidden three-axis motor.

## Drive model and assumptions

The model is DC-equivalent and averaged, not a phase-resolved BLDC/FOC controller. A lossless rotational transmission maps motor rotation into screw translation; separate dissipative friction represents drive loss. Full rotor-axis gyroscopic coupling, gear elasticity/backlash, thermal duty cycle, regenerative-bus dynamics and PWM switching are omitted.

```text
conversion = 2π × gear_ratio / screw_lead
K = torque_constant × conversion       [N/A = V/(m/s), in SI]
back_EMF = K × actual_leg_velocity
L di/dt = applied_voltage − R i − back_EMF
motor_force = K i
```

Motor rotational inertia is reflected as `J_motor (2π gear / lead)²` along each leg length. Its mass-matrix and velocity-bias terms are included, but it adds no fictitious gravitational mass. The generic rotor inertia is 1 × 10⁻⁶ kg·m² (about 2.47 kg of equivalent axial inertia per leg).

The winding state is **current**, not the last force after mechanical damping. Winding-current feedback is ideal; current ADC noise is not modeled. Voltage feedforward uses measured encoder velocity, while the physical back-EMF equation uses actual velocity. Its held-voltage RL equation is coupled to the new mechanical velocity in the implicit plant solve. This prevents a stiff back-EMF term from becoming an explicit numerical oscillation; it is not true-velocity feedback to the controller. Voltage and current limits constrain delivered force. Net friction is a separate dissipative term. A zero-current command is not an instantaneous deletion of electrical state. Servo projects use the `stewart-lab/2` envelope so older app versions reject them instead of silently dropping electrical/sensor state; classic projects retain version 1.

| Tested generic setting | Value |
|---|---:|
| Supply; winding R and L | 24 V; 4 Ω; 8 mH |
| Torque constant; reduction; lead | 0.08 N·m/A; 2:1; 8 mm/rev |
| Current-loop P/I gains | 3 V/A; 2500 V/(A·s) |
| Current limit; request slew | 2.5 A; 150 A/s |
| Governed reference speed; acceleration | 60 mm/s; 250 mm/s² |
| Encoder sampling; delay; resolution | 250 Hz; 4 ms; 10 µm |
| Encoder bounded noise; velocity-filter cutoff | ±2 µm; 30 Hz |
| Position gain; velocity P/I gains | 22 s⁻¹; 80 N·s/m; 120 N/m |
| Coulomb-like loss; viscous loss | 0.4 N; 4 N·s/m |

All of these values are assumptions, **not identified hardware parameters**. There is no universal realistic actuator speed: commercial examples span markedly different force/speed envelopes. The 60 mm/s number limits the motion reference, not the physical velocity by coordinate clamping. External back-driving and transients can exceed a command limit; actual speed is measured and displayed separately.

A length-reference governor limits speed/acceleration. Encoder position error corrects the governed reference through a velocity PI loop with anti-windup. Acceleration limiting is not placed on the feedback correction itself: doing that delayed braking and caused a reproducible limit cycle during development. Gravity feedforward uses the sensed pose, not exact ball coordinates.

## Encoders, IMU and ball measurements

Encoder samples are quantized, noisy and delivered after a queue delay. FK at 40 Hz estimates the platform pose from the delivered lengths. A 200 Hz gyro propagates attitude between FK corrections. Translation and angular rate are estimated from these signals. The IMU lives conceptually at the deck center; it does not add a box to the rolling surface.

The accelerometer reports **body-frame specific force**, `Rᵀ(a − g)`. Linear acceleration is therefore not mistaken for tilt. Its signal is displayed, but it is not fed into an accelerometer-only attitude correction. Gyro bias and noise are generic bounded models. This is a complementary gyro/FK estimator, not a complete navigation EKF or a calibrated sensor package.

The ball-position channel is a proxy for already-detected, calibrated coordinates: 50 Hz, 40 ms latency, ±0.7 mm noise in the tested preset. It includes finite field-of-view/height validity and optional dropout. It does not render camera pixels or infer position from physical load cells.

An alpha-beta observer updates **at the measurement's capture timestamp**:

```text
predicted_at_capture = previous_posterior + estimated_velocity × sample_interval
residual = delivered_position − predicted_at_capture
posterior_position = predicted_at_capture + α × residual
estimated_velocity += β × residual / sample_interval
position_now = posterior_position + estimated_velocity × measurement_age
```

Here α = 0.35 and β = 0.06. The predictor does not compare an old measurement with a current-time state, and it does not artificially leak a constant velocity toward zero. Samples older than 200 ms cause a smooth request toward level; this is a degraded mode, not a guarantee of ball retention. Controller code never reads true ball velocity in sampled mode.

The outer loop remains 100 Hz. The servo preset uses position/velocity gains 2.5 s⁻² and 2.8 s⁻¹, a 0.24 rad/s per-axis command-rate limit and a 40 ms command filter. Click targets follow a smooth quintic transition. Circle entry is blended over 2.2 s; the radius is 80 mm and angular speed is 0.35 rad/s. These changes accommodate the slower plant instead of slowing only the video.

## Verification and limits

`tests/realism.test.cjs` checks electrical DC response/back-EMF, complete saved state, same-timestamp observer updates, IMU specific force and socket-axis invariants. `tests/realism_dynamics.test.cjs` has three separate scenarios: `balance`, `play`, and `circle`. Each checks voltage/current/reference-speed bounds and records measured errors. The balance scenario measures ball RMS and a 3 Hz first-order high-pass tilt RMS during seconds 8–12 of a 12-second stationary-target run. This is a reproducible jitter metric, not a universal stability proof.

The ball/deck contact remains the existing first-order partitioned impulse model. Rendering smoothness, CPU/GPU throughput, control jitter and physical accuracy are different questions. A green numerical/browser test is not independent hardware validation.

## Primary references

- maxon, **Motor data and simulation** — current/torque, generator constants and simulation caveats: https://support.maxongroup.com/hc/en-us/articles/360013761160-Motor-data-and-simulation
- Thomson, **Max Jac** — one concrete actuator's load, speed, feedback and duty-cycle specifications, not parameters fitted here: https://www.thomsonlinear.com/en/products/linear-actuators/maxjac
- Ganter, **GN 782 Ball Joints** — separate ball/shank and mounting-socket construction; our dimensions and travel model are not this product: https://www.ganternorm.com/en/products/product-family/Stainless-Steel/GN-782-Ball-Joints-Stainless-Steel
- VectorNav, **What is an Inertial Measurement Unit?** — gyro angular rate and accelerometer specific force: https://www.vectornav.com/resources/detail/what-is-an-inertial-measurement-unit
