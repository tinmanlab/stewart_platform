# References and attribution

These sources establish concepts and provide further reading. This lab is a custom implementation, **not a reproduction of every algorithm or experiment in the cited works**. No paywalled paper files or publisher figures are redistributed.

## Robotics and control

**1. D. Stewart (1965).** “A Platform with Six Degrees of Freedom.” *Proceedings of the Institution of Mechanical Engineers*, 180(1), 371–386. [DOI: 10.1243/PIME_PROC_1965_180_029_02](https://doi.org/10.1243/PIME_PROC_1965_180_029_02). Historical motivation for six-degree-of-freedom platforms. It is not evidence that this particular 6-SPS implementation reproduces the original machine.

**2. B. Dasgupta and T. S. Mruthyunjaya (2000).** “The Stewart platform manipulator: a review.” *Mechanism and Machine Theory*, 35(1), 15–40. [DOI: 10.1016/S0094-114X(99)00006-3](https://doi.org/10.1016/S0094-114X(99)00006-3). Background on parallel-manipulator analysis, kinematics and design. This is a historical review, not a current SOTA claim.

**3. J.-P. Merlet (2006).** *Parallel Robots*, second edition. Springer, Solid Mechanics and Its Applications 128. [DOI: 10.1007/1-4020-4133-0](https://doi.org/10.1007/1-4020-4133-0). Further study of assembly modes, workspace, singularities, statics, dynamics and calibration. The lab's local FK does not implement all solution methods discussed in the book.

**4. N. Hogan (1985).** “Impedance Control: An Approach to Manipulation: Part I—Theory.” *Journal of Dynamic Systems, Measurement, and Control*, 107(1), 1–7. [DOI: 10.1115/1.3140702](https://doi.org/10.1115/1.3140702). Foundational reference for controlling mechanical interaction. The lab implements a simple virtual spring/damper task-space impedance; it does not implement the paper's entire framework or establish general passivity. Bibliographic identity was checked; the publisher's full text was not accessible during preparation.

**5. K. M. Lynch and F. C. Park (2017).** *Modern Robotics: Mechanics, Planning, and Control*. Cambridge University Press. [Authors' Chapter 5 lessons](https://modernrobotics.northwestern.edu/chapters/chapter5/) and [velocity kinematics and statics](https://modernrobotics.northwestern.edu/nu-gm-book-resource/velocity-kinematics-and-statics/). An accessible route to Jacobians and virtual work. Be careful: this lab's leg Jacobian maps platform velocity to leg speed; the serial-robot Jacobian convention differs.

## Implementation and repository practice

[GitHub Pages: custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) — separate a checked build from a deployment, use a Pages environment, and grant deployment permissions only to the deploy job.

[GitHub Actions: secure use](https://docs.github.com/en/actions/reference/security/secure-use) — least-privilege tokens, commit-pinned actions, and no privileged execution of untrusted pull-request code.

[GitHub: community profiles](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories) — concise contribution guidance, issue templates, licensing and reporting instructions.

[Playwright: screenshots](https://playwright.dev/python/docs/screenshots) and [videos](https://playwright.dev/python/docs/videos) — reproducible browser-based verification and recording. The supplied media generator uses real browser frames and the lab's fixed-step solver; its playback speed is not a performance benchmark.

## Rights and reuse

The repository's existing MIT license is retained. New diagrams are original explanatory SVGs. Screenshots and demonstration clips depict this application, not a third-party recording. Media is generated from source rather than downloaded from papers or video sites. Fonts use system fallbacks; font files are not bundled. Cite the software through `CITATION.cff`, and cite the relevant original work separately when discussing its ideas.
