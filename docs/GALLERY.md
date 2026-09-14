# Watch, then try

These silent 12-second recordings use real controls and the fixed-step solver. Captions explain cause and effect. Playback is edited and is not a runtime performance benchmark. [Play Ball Lab](https://tinmanlab.github.io/stewart_platform/?demo=ball) for the representative experiment.

## 1. A pose becomes lengths; different lengths become a pose

<video controls preload="none" poster="media/01-ik-fk.png" aria-label="Separate inverse and forward kinematics"><source src="media/01-ik-fk.mp4" type="video/mp4"><track kind="captions" src="media/01-ik-fk.vtt" srclang="en" label="English"><a href="media/01-ik-fk.mp4">Open video</a></video>

**Watch:** first a changed target drives six changing lengths. Next a different, valid six-length set is entered. FK reconstructs its ghost pose. Applying the result starts a second visible motion of the physical plate. FK does not teleport the mechanism or produce motor forces.

[Try IK](https://tinmanlab.github.io/stewart_platform/?demo=ik) · [Try FK](https://tinmanlab.github.io/stewart_platform/?demo=fk)

## 2. Same force, different stiffness

<video controls preload="none" poster="media/02-compliance.png" aria-label="Stiff and soft responses to the same force"><source src="media/02-compliance.mp4" type="video/mp4"><track kind="captions" src="media/02-compliance.vtt" srclang="en" label="English"><a href="media/02-compliance.mp4">Open video</a></video>

**Watch:** the same +16 N, −16 N, then zero-force sequence acts on two independently simulated platforms. K = 800 N/m predicts ±20 mm settled displacement; K = 200 N/m predicts ±80 mm. The video shows the measured transient values, not a fictitious enlarged response. Release is part of the experiment. Static F/K predictions do not describe every transient sample.

[Try compliance](https://tinmanlab.github.io/stewart_platform/?demo=compliance)

## 3. Motors or springs?

<video controls preload="none" poster="media/03-passive.png" aria-label="Gravity support and passive springs"><source src="media/03-passive.mp4" type="video/mp4"><track kind="captions" src="media/03-passive.vtt" srclang="en" label="English"><a href="media/03-passive.mp4">Open video</a></video>

**Watch:** an impulse moves the gravity-compensated platform without a position-return command. A passive spring configuration responds differently. Stiffness and damping remain physical parameters; motor-off is not locked.

[Try passive joints](https://tinmanlab.github.io/stewart_platform/?demo=passive)

## Reproduce

Run `python tools/record_demos.py`, `python tools/build_preview.py`, then `python build.py --site`. The recorder writes the source-HTML hash and sampled states to `artifacts/recordings.json`. WebM and MP4 playback are provided by the generated site. The new hero is the ball scenario: balance, target movement, circle, push and reset. Written explanations remain available when video is unavailable.
