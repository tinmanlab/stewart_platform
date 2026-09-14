# Contributing

Beginners and experienced roboticists are welcome. Report one reproducible problem or propose one coherent improvement. A useful issue contains the browser, exact control steps, expected result, observed result and a saved project without personal data.

## A small review contract

Use a branch and pull request; keep unrelated cleanup out. Explain what changes, why, and how it was checked. For UI changes include an actual screenshot and keyboard/mobile checks. For mechanics changes add a targeted regression and update the equation-to-code explanation. Numerical agreement is not hardware validation. Never label an author's self-check as independent approval.

## Reproduce the checks

Python 3.13, Node 22 and FFmpeg are the development baseline. The simulator itself has no external runtime dependencies. UI tests include explicit controller ownership, return paths and saved-state recovery; do not treat a screenshot as a passing interaction test.

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python build.py
node tests/core.test.cjs
node tests/endurance.test.cjs
node tests/ball.test.cjs
node tests/ball_invalid.test.cjs
node tests/realism.test.cjs
node tests/realism_dynamics.test.cjs balance
node tests/realism_dynamics.test.cjs play
node tests/realism_dynamics.test.cjs circle
python tests/english.test.py
python tests/browser_smoke.py
python tests/experience.test.py
python tests/ball_browser.py --serve
python tests/usability.test.py
python tools/record_demos.py        # FFmpeg must be on PATH
python tools/build_preview.py
python build.py --site
python tests/site.test.py
python tests/site_hardening.test.py
python tests/hosted_smoke.py        # real local HTTP, not injected HTML
python -m http.server 8000 --directory site
```

Open `http://localhost:8000` for the full learning site. Linux CI includes the DejaVu fonts used in the preview; on other systems adapt `FONT` and `BOLD` in `tools/build_preview.py` to local fonts. No font binaries are shipped. Environments that prohibit browser navigation may run the injected-HTML suite, but must report the HTTP suite as blocked, not passed.

For a deployed site, use `python tests/hosted_smoke.py --base-url https://tinmanlab.github.io/stewart_platform/ --expected-commit <40-character-SHA> --readme`. It makes read-only requests; it does not deploy or change repository settings.

## Keep ownership simple

Edit `src/`, not generated `site/index.html`. Update Markdown in `docs/`, not projected HTML. Keep English as the maintained language and leave `archive/ko/` unchanged. Do not upload copied publisher figures, paper PDFs, private models, credentials or personal classroom data. Cite original ideas separately from this software.

Discuss a physical model change before broadening its claims. New backends, frameworks or services need a demonstrated gap, not just a preference. Prefer a small correction to a new layer. Read [the model](docs/THEORY.md), [code map](docs/CODE_MAP.md) and [limits](docs/VALIDATION.md) before interpreting a simulation as engineering evidence.

Report security-sensitive problems using [SECURITY.md](SECURITY.md). Be patient with questions, precise about evidence and respectful of contributors. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
