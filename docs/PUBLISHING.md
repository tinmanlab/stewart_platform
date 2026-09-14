# Publishing and maintaining the lab

## The publishing contract

One source repository, one build, one GitHub Pages site. The maintained application and learning material are English; the Korean v1.0 archive is checksum-protected. Generated media does not become a second physics implementation.

A pull request runs numerical tests, language/archive checks, real UI tests, media generation, link/heading checks and HTTP navigation under a project prefix. Only `main` can deploy. After deployment, the same HTTP acceptance test visits the **public URL** and the actual GitHub-rendered README.

The test checks all files against `build.json`, including the source commit and English/Korean bytes. It also tests five direct experiment URLs, compliance load/release, passive-joint edits, learning links, heading navigation, video playback, mobile layout and the README's image proxy. A successful upload is not substituted for those checks. A bounded readiness retry allows Pages propagation; persistent failure fails the job and preserves evidence.

## First activation, once per repository

The maintainer selects **Settings → Pages → Source → GitHub Actions**. The existing `.github/workflows/pages.yml` is sufficient; do not add another template. The public URL is `https://tinmanlab.github.io/stewart_platform/`.

After activation, run **Test and publish**, or retry a failed deploy while its artifact is available. If the artifact expired, rebuild instead. [Official Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Normal maintenance

Use a focused branch and PR. Numerical changes require targeted physical tests, not only screenshots. UI and documentation changes must pass browser and link tests. Production deployments are serialized rather than cancelled halfway through. Checkout does not persist credentials. Build/verification jobs have read-only repository access; only the deploy job has Pages/OIDC write permissions. There is no PAT, new service or custom domain.

The full site build removes stale generated output. Every release records an output-hash map. The README uses one compact GIF served from the same Pages artifact, with a still image, controlled video and reduced-motion alternative. The three teaching clips retain captions and transcripts. If a media filename changes, update references and tests together.

Dependabot proposes updates, but no automatic merge is implied. Require the `build` check and PR review on `main`; block force pushes and deletion. Repository rules and `github-pages` environment restrictions are owner settings, not guarantees supplied by `CODEOWNERS`.

## Troubleshooting

| Symptom | Inspect first |
|---|---|
| Deployment 404 | Pages activation and selected publishing source. |
| Old content after a successful deployment | `build.json` source commit and the post-deploy verification job. |
| Image absent on GitHub | The Pages image URL, then GitHub's image proxy; do not replace it with a fake successful badge. |
| Simulation stopped | The visible numerical warning and saved project. Reset before adjusting a gain. |
| A broken bookmark | The site's 404 recovery page links back to the lab and guide. |

Tests reduce regressions; they cannot guarantee no network outage, browser bug or unstable user-defined controller. Report these boundaries honestly. [Contributing](../CONTRIBUTING.md) covers local reproduction; [validation](VALIDATION.md) separates software checks from physical evidence.
