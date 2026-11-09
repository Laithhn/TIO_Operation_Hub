---
decided: 2026-07-31
---

# Split the webpack filesystem cache per mode

## Context and Problem Statement

The DevServer (`devServer:web`) and the plain dev build (`build:web-dist-dev`) both have `isDevelopment === true` and therefore shared the cache directory `default-development`. They use different CSS pipelines though: the DevServer uses `style-loader`, the dev build `MiniCssExtractPlugin`. The dev build wrote serialized `CssDependency` objects into the shared cache that the DevServer could not deserialize on read — one warning per affected module, so hundreds of them, and an effectively useless cache.

## Considered Options

- Turn the filesystem cache off entirely
- Load `MiniCssExtractPlugin` in the DevServer too, so deserialization succeeds
- Set `cache.name` per mode, i.e. separate cache directories

## Decision Outcome

Chosen: **`cache.name: isDevServer ? 'devserver' : 'devbuild'`** in `webpack.config.js`. **This split must not be removed.**

The actual cause lies in the plugin and no update fixes it: `mini-css-extract-plugin@2.10.2` defines `CssDependency` inline in `dist/index.js` but registers it under a file path it does not ship (`webpack.util.serialization.register(CssDependency, path.resolve(__dirname, "CssDependency"), …)` — `dist/CssDependency.js` does not exist). On write the identifier suffices; on deserialization in a process without the plugin active, webpack tries to `require` it and fails. 2.10.2 is the current version.

Loading the plugin in the DevServer as well would have changed its CSS pipeline to work around a cache defect; turning the cache off would have sacrificed the startup gain.

## Consequences

- Good: the DevServer recompiles on restart in **1509 ms instead of 9321 ms** — the failed restore had rendered the cache useless before. The flood of warnings is gone.
- Bad: two cache directories instead of one, so twice the disk space and a cold first build per mode.

Symptom signature, should it ever return:

```
<w> [webpack.cache.PackFileCacheStrategy] Restoring failed for FlagDependencyExportsPlugin|…!….scss
    from pack: Error: Cannot find module '…\node_modules\mini-css-extract-plugin\dist\CssDependency'
    (during deserialization of webpack/lib/cache/PackFileCacheStrategy PackContentItems)
```

Operational notes: [documentation/toolchain/webpack-cache.md](../documentation/toolchain/webpack-cache.md).