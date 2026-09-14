# Publishing and maintaining the lab

## First activation

The public address is `https://tinmanlab.github.io/stewart_platform/`.

A repository owner or maintainer opens **Settings → Pages → Build and deployment → Source → GitHub Actions**. No new template workflow is needed: this repository already provides one. Then run **Test and publish** from Actions, or re-run a failed deployment after activation. A URL in the README does not itself establish that deployment succeeded.

The expected result is a successful `build` job followed by a successful `deploy` job and a live page containing **Stewart Platform Lab**. Check the English app, `learn/index.html`, each video, and `ko/index.html` in a fresh browser. `build.json` binds published bytes to source files. Keep a real deployed-browser smoke test separate from local `set_content` checks.

Official setup: [GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Normal changes

Use a focused branch and pull request. The build checks code, localization, frozen-archive checksum, numerical regressions, browser interactions and generated-site links. It then records the clips and packages the static site. Only a successful build from `main` may reach the Pages deployment job. The deploy job receives `pages: write` and `id-token: write`; the test job has only `contents: read`. Checkout credentials are not persisted.

There is no PAT, privileged `pull_request_target`, production service, custom domain or hardware connection. Do not add credentials to project JSON, screenshots, examples or issue reports. Media is generated rather than repeatedly committed as large files.

## Recommended owner settings

Require pull requests and the `build` check on `main`; block force pushes and branch deletion. Where an independent reviewer is available, require their review. Do not claim an independent review for an author's own test run. Limit the `github-pages` environment to `main`. Enable private vulnerability reporting where available. These are recommendations until the owner actually configures them; `CODEOWNERS` is not branch protection by itself.

Dependabot proposes updates to pinned Actions and Python tooling. Review the diff and let checks run before merging; do not auto-merge a tool update merely because its version is newer. A changed numerical model requires targeted scientific tests and documentation, not just a screenshot comparison.

## Release and archive policy

`src/` and `docs/` are editable source; `site/` and `artifacts/` are generated. The English app is the maintained experience. The Korean v1.0 archive is immutable, with a SHA-256 guard. Do not backport fixes into that archive silently. Publish a separately named Korean revision if one is deliberately translated later.

Tag releases only after checking the exact commit, local/CI evidence and the live website. Do not assign a software DOI unless a real archival service has issued one. See [contribution guidance](../CONTRIBUTING.md) and [evidence boundaries](VALIDATION.md).
