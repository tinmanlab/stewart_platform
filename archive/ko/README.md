# Korean v1.0 — frozen original

The original Korean simulator is preserved byte-for-byte as a reproducible archive. `python build.py` restores it to `site/ko/index.html`, independently of later English-source changes. Open that file locally, or use the [published Korean archive](https://tinmanlab.github.io/stewart_platform/ko/).

Original HTML SHA-256:

```
a9e3ed420a902c0c6dc24a87596c380c4cb9d63280104ad7cd2a389d8cfdc870
```

`baseline/` is an immutable snapshot whose Git blobs are shared with the initial English release. `restore.json` records the text edits that recover the original Korean HTML. The builder verifies both the frozen baseline and recovered-original checksums. This text-based archival representation avoids a second maintained physics implementation and does not depend on a network service.

Do not edit these frozen files or silently backport changes. The maintained application is in `src/`. An intentionally updated Korean edition must use a new archive name and its own checksum. This original release retains its original language and UI behavior; current learning pages describe the English version.
