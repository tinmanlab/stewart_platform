# Model, equations and implementation notes

This document specifies the implemented mathematical model, not a certified physical machine. SI units are used internally; the interface converts position to millimetres and orientation to degrees. World Z is up. Quaternions are stored as `[w,x,y,z]`; displayed Euler angles obey `R = Rz(yaw) Ry(pitch) Rx(roll)`.

## 1. Geometry, loop closure and coordinates

Each leg is an SPS chain: a spherical base joint, an ideal prismatic joint, and a spherical platform joint. The fixed base anchor is b_i and the moving anchor in the platform frame is a_i. For platform position p and rotation R:

```
r_i = R a_i
x_i = p + r_i
l_i = ||x_i - b_i||
n_i = (x_i - b_i) / l_i
```

These expressions define exact anchor coincidence and leg direction at every integration step. There are no independent constraint-violating endpoint coordinates to project back onto the loop. Axial extension is free to change and is driven by force; it is not a prescribed length constraint during dynamics.

The configuration uses a platform position/quaternion and six leg spin angles phi_i. The generalized speed vector is:

```
u = [v_world (3), omega_world (3), phi_dot_1 ... phi_dot_6]
```

The six internal axial spins are retained because a spherical-ended, axisymmetric barrel/rod pair can rotate about its own axis. Platform mobility remains six. Changing a geometric joint from passive to active changes applied efforts, not kinematic DOF or constraint topology.

The leg orientation chart is `Q_leg = Q_shortest(+Z -> n_i) Qz(phi_i)`. It is singular at n_i = -Z; the implementation raises an explicit safety error near that chart singularity. This chart is appropriate to the intended upright assembly, not all possible folded/inverted configurations.

## 2. Inverse and forward kinematics

The six lengths above are analytic IK. Their rates are:

```
l_dot_i = n_i · v + (r_i × n_i) · omega
J_i = [n_i^T, (r_i × n_i)^T]
l_dot = J [v; omega]
W_platform = J^T f
```

Positive prismatic force tends to lengthen the corresponding leg. The condition diagnostic scales the angular columns by `1 / topRadius`, so translation and rotation have a common characteristic length. It is not an unscaled mixed-unit condition number.

FK minimizes the six length residuals from a home or previous solution using damped local Newton iterations, step limiting and line search. Convergence tolerance is the Euclidean length-residual norm below 1e-9 m; at most 65 iterations are attempted. FK returns residual and success status rather than substituting a desired pose after failure. The FK display is independent of the simulated position; the live diagnostic is warm-seeded by the preceding FK result.

Different assembly branches are not enumerated. Leg spin is not observable from six lengths and is retained from the FK seed. The target check covers six axial strokes, minimum platform reference height, and a normalized Jacobian condition threshold of 200. It does not prove global collision-free workspace or check ball-joint angular travel.

## 3. Finite-mass body model

The model contains the platform disk, a rigidly attached payload box when mass is nonzero, six solid-cylinder barrels and six solid-cylinder rods: 14 moving bodies with payload, 13 without. The fixed base does not contribute moving inertia.

The maintained model uses an attachment-plane reference origin. The disk centre of mass is offset by `deckOffset` in local Z (62 mm in the new reference design); `pointJac(r)` carries this offset into its translational mass and gravity terms. The optional payload centre is a further `payloadZ` above the disk centre. A legacy saved project without `deckOffset` restores zero offset, preserving the historical reference convention. Each barrel is centred at `b_i + n_i * barrelLength/2`; each rod is centred at `x_i - n_i * rodLength/2`. Rod and barrel share leg orientation and the ideal prismatic joint does not permit relative rotation. Their axial overlap is physically intentional; the model treats them as telescoping parts, not colliding solid volumes.

Solid-cylinder/disk and box analytic inertia formulas are used. Rendering-only collars, fixtures, top coatings and fasteners are not separate inertial bodies. Moving-body mass/inertia should therefore be interpreted as assigned lumped engineering properties, not inferred from the decorative meshes.

For each body b, linear and angular Jacobians map generalized speed to body motion:

```
v_b = Jv_b u
omega_b = Jw_b u
M = sum_b (m_b Jv_b^T Jv_b + Jw_b^T I_b_world Jw_b)
G = sum_b Jv_b^T m_b [0, 0, -g]
```

For the platform attachment point, `Jx = [I, -[r]_cross, 0]`. Leg direction rate and angular velocity follow:

```
n_dot = (I - n n^T) x_dot / l
omega_leg = n × n_dot
            - n (n_x n_dot_y - n_y n_dot_x)/(1+n_z)
            + n phi_dot
```

The axial correction corresponds to the chosen shortest-swing orientation chart. It is not omitted. Body translational and angular Jacobians are tested against central finite differences for all twelve speed components.

The dynamics are:

```
M u_dot + h = G + tau_joint + tau_external + tau_stop
h = sum_b [ Jv_b^T m_b (Jv_dot_b u)
          + Jw_b^T (I_b_world Jw_dot_b u
                    + omega_b × (I_b_world omega_b)) ]
```

Convective accelerations use centred directional differences of the analytical body Jacobians along the current speed. The differencing interval is `1e-5 / max(1, ||u||)` in the implementation. Thus h is evaluated numerically, not claimed to be a fully symbolic expression. The mass matrix and gravity are recomputed from current body poses. No generic drag is silently substituted for inertial coupling.

A sustained external `[Fx,Fy,Fz,Tx,Ty,Tz]` acts at the platform reference origin in world coordinates. It is extended with six zeros to generalized coordinates. An impulse changes speed by `M^-1 * generalizedImpulse`, rather than changing position directly.

## 4. Joint efforts and actuation

A prismatic joint has scalar generalized-force column `J_i^T`. A base spherical joint has three torque columns from `Jw_leg^T`. An upper spherical joint uses the relative angular Jacobian `(Jw_leg - Jw_platform)^T`. A positive upper torque acts on the leg; the opposite reaction acts on the platform.

There are eighteen independently selectable joint groups. Making every group active yields 42 effort components: six prismatic forces and 36 spherical torques. This is an ideal mathematical actuation model, not a proposal to install 42 independent physical motors. Spherical effort limits are per world-axis component, not a norm bound on the three-axis vector.

### Passive mode

```
f_P = k (l_rest - l) - c l_dot
T_S = k e_R - c omega_relative
```

Base-joint orientation error is the rotation-vector error toward the stored world rest quaternion. Upper-joint orientation error is formed in the platform frame and rotated into world coordinates. Spherical k and c are isotropic scalars; anisotropic per-axis stiffness matrices are not implemented.

The corresponding ideal spring potentials are `0.5 k (l-l_rest)^2` and `0.5 k ||rotation_error||^2`. Virtual-work/energy-gradient tests cover both types. Capturing rest changes the physical energy reference instantaneously; it is an explicit user parameter change, not an energy-conserving physical operation.

Only passive joints receive these passive elements. An active joint uses its controller gains instead. `k=c=0` is free motion, not a lock. The global drives-off mode removes active motor commands but leaves passive physical elements and contacts operating.

### Effort allocation and underactuation

The active columns form B. A normalized, regularized weighted minimum-effort solve attempts `B effort = tau_requested`. Active-set clipping handles force/torque capacities. It never adds missing passive motors. Torque coordinates are scaled by a characteristic length so the displayed residual, labelled N*, is a force-equivalent mixed wrench norm—not a pure force in N.

The allocation is a bounded approximate solve; its active-set loop is limited and is not claimed to find a globally optimal quadratic-program solution in every redundant/saturated case. Residual and saturation counts are visible. A six-leg mechanism with a passive linear joint may not independently generate a general six-axis wrench.

## 5. Controllers

### IK / length PD

```
l_des = IK(p_des, R_des)
f_i = Kp_i (l_des_i-l_i) - Kd_i l_dot_i + f_gravity_i
```

The gravity term is optional. Active spherical joints likewise use target orientation error and angular damping. There is no desired-velocity or desired-acceleration feedforward in the IK controller. Slow trajectories are intentional; this is not a high-bandwidth computed-torque tracking claim.

### Gravity compensation

The requested generalized effort is `-G`, allocated only to active motors. In gravity-only mode, position feedback is absent; a small configurable active-slider damping is retained. Active spherical joints have small angular damping. Passive springs or externally applied forces can still move the mechanism. Exact static holding with the same model used for dynamics is an internal consistency test, not evidence of real-world calibration accuracy.

### Compliance / task-space impedance

```
F_des = Kx (p_des-p) - Dx v
T_des = Kr Log(R_des R^T) - Dr omega
requested_tau = [F_des, T_des, zeros(6)] + optional(-G)
```

These virtual spring/damper forces are allocated to active motors. This is direct impedance/compliance control, not a separate force-sensor-driven admittance trajectory generator. For the default unconstrained, unsaturated setup without added passive stiffness, a constant force approximately obeys `displacement = F/K` at equilibrium. Changes to passive stiffness, geometry, actuation, gravity compensation or saturation can change that relation.

### Direct effort / inverse dynamics

Manual mode takes per-joint bounded force/torque without automatic position or gravity control. The inverse-dynamics workbench computes:

```
tau_required = M a_requested + h - G - tau_passive - tau_external
```

It allocates this to active motors and reports residual and saturation. The UI specifies the six platform accelerations; internal leg-spin accelerations are zero in this calculation. It is a diagnostic calculation, not an automatically enabled computed-torque controller. Penalty-stop/contact forces are excluded from this inverse-dynamics workbench; do not interpret it as exact contact-aware inverse dynamics at a stop.

## 6. Integration, contacts and numerical limits

Default dt is 0.001 s. A semi-implicit update solves for the next generalized speed with joint/stop damping treated backward at the current geometry:

```
(M + dt D_joint) u_next = M u_current + dt * remaining_forces
p_next = p + dt v_next
Q_next = normalize(Exp(dt omega_next) Q)
phi_next = phi + dt phi_dot_next
```

Bounded active motor damping uses an iterative active-set approximation (up to four iterations), so clipping a force also removes its unbounded implicit-damping contribution. Stiffness and task-space damping are not all treated fully implicitly. This integrator does not guarantee energy conservation, passivity or stability for arbitrary gains/time steps. Numerical limits stop excessive translational/angular motion or non-finite states.

Axial stops are compliant penalties with stiffness 40,000 N/m and outward-motion damping 180 N·s/m. A simplified platform-bottom floor contact at Z=0.045 m samples six perimeter points, with stiffness 60,000 N/m and damping 180 N·s/m. Penetration is possible. The base Stewart model has no Coulomb friction or self-collision. The separate [Ball Lab](BALL_LAB.md) extension adds unilateral sphere/deck contact and Coulomb tangential impulses; it is not a general collision engine.

Displayed energy includes kinetic, gravitational and passive-spring energy only. Penalty contact energy is excluded. Changes to mass, geometry, rest configuration, control or actuation are external model edits and can change energy discontinuously.

The animation loop uses a fixed physical step with a bounded computation budget. When the machine is slow, simulated time advances more slowly than wall time; physical dt is not enlarged to fake real-time speed. The measured real-time factor is displayed. CSV samples are UI observations, not each internal solver step.

## 7. Reuse

`src/core.js` exposes `globalThis.Stewart` with no rendering dependency. Node example:

```js
require('./src/core.js');
const S = globalThis.Stewart;
const sim = S.makeSimulation();
sim.settings.mode = 'compliance';
sim.settings.translationK = 800;
sim.settings.external = [16, 0, 0, 0, 0, 0];
for (let i = 0; i < 1500; i++) {
  S.step(sim);
  if (sim.halted) throw new Error(sim.error);
}
console.log('x [m]:', sim.state.p[0]);
```

See `tests/core.test.cjs` for reproducible acceptance cases and `docs/VALIDATION.md` for measured results. None of these tests is an independent hardware measurement or a cross-engine validation.

## 8. Reading and provenance

The equations above describe this repository’s implementation, not a claim of reproducing a particular paper. See [References](REFERENCES.md) for Stewart and parallel-robot background (1–3), impedance-control context (4), and Jacobian / virtual-work lessons (5). See [Code map](CODE_MAP.md) to locate each equation in the source and [Validation](VALIDATION.md) for the tested scope.
