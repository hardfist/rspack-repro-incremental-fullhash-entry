# Rspack incremental per-entry fullhash filename repro

Rspack issue: [web-infra-dev/rspack#14869](https://github.com/web-infra-dev/rspack/issues/14869)

`@rspack/core@2.1.4` reuses an old per-entry filename after the compilation full hash changes.

```bash
npm install
npm test
```

The fixture keeps the build-chunk-graph cache reusable by including an async import. The first entry uses `[name].[fullhash].js`; only the second entry changes. The second compilation gets a new full hash, but `dist` still contains the first entry under the old hash.

Expected: `first.<second-compilation-hash>.js` exists.

Actual: only `first.<first-compilation-hash>.js` exists.
