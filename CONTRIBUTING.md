# Contributing

Beginners and experienced roboticists are welcome. Report one reproducible problem or propose one coherent improvement. A useful issue contains the browser, exact control steps, expected result, observed result and a saved project without personal data.

## A small review contract

Use a branch and pull request; keep unrelated cleanup out. Explain what changes, why, and how it was checked. For UI changes include an actual screenshot and keyboard/mobile checks. For mechanics changes add a targeted regression and update the equation-to-code explanation. Numerical agreement is not hardware validation. Never label an author's self-check as independent approval.

Run the commands in the [README](README.md). The minimum fast checks are the two Node suites, `python tests/english.test.py` and `python build.py`. Before integration also run the browser smoke, media generator, full site build and site checks. Node 22, Python 3.13 and FFmpeg are the tested development baseline; no runtime libraries are required by the simulator.

## Keep ownership simple

Edit `src/`, not generated `site/index.html`. Update Markdown in `docs/`, not projected HTML. Keep English as the maintained language and leave `archive/ko/` unchanged. Do not upload copied publisher figures, paper PDFs, private models, credentials or personal classroom data. Cite original ideas separately from this software.

Discuss a physical model change before broadening its claims. New backends, frameworks or services need a demonstrated gap, not just a preference. Prefer a small correction to a new layer. Read [the model](docs/THEORY.md), [code map](docs/CODE_MAP.md) and [limits](docs/VALIDATION.md) before interpreting a simulation as engineering evidence.

Report security-sensitive problems using [SECURITY.md](SECURITY.md). Be patient with questions, precise about evidence and respectful of contributors. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
