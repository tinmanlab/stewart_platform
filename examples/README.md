# Small reproducible examples

`node examples/compliance.cjs` runs a headless 1.5-second, 1 ms-step force/displacement experiment and checks its settled result. It uses the same `src/core.js` as the browser.

Download `compliance-16n.json` and choose **Load project** in the simulator. The file contains a home-state project with compliance mode, K = 800 N/m and a sustained +X force of 16 N. Imports open paused: inspect the settings and press **Run**. These are SI-valued example inputs, not experimental measurements or hardware configuration.

Additional recipes and expected observations are in [Four experiments](../docs/EXPERIMENTS.md). Lesson URL parameters load the same existing presets instead of a second implementation.
