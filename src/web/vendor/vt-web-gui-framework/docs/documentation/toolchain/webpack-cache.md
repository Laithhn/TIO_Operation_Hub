# Webpack filesystem cache

Operational notes on the filesystem cache in `webpack.config.js`. Why it is split per mode: ADR [general-webpack-cache-per-mode.md](../../decisions/general-webpack-cache-per-mode.md).

## Cache invalidation is expected

`cache.buildDependencies.config` contains `webpack.config.js` itself as well as `settings.js` and `localSettings.cjs`. **Any** change to one of these files invalidates the cache completely. The first start afterwards is slow and writes it anew — that is not a defect.

## Don't kill the DevServer hard

Webpack writes cache packs to `X.pack.gz_` and renames them afterwards. A `taskkill /F` in the middle of a cache write leaves those temporary files behind, which leads to `Restoring pack failed: Unexpected header byte …` on the next start. Before forcing a kill, check whether such files sit in the cache directory.

## Discarding a broken cache

Delete `node_modules/.cache/webpack` — regenerable, around 68 MB last time.

## Not a problem: "Serializing big strings"

The four `Serializing big strings` warnings per cache write are the normal floor (presumably `icons.json` at 263 KiB and the i18n data).

`compression: 'gzip'` does **not** suppress them, even though that was assumed for a while: the warning comes from the serializer on **write**, as soon as a single string exceeds the size threshold — compression is applied to the stream only afterwards. Established on 2026-07-31: `compression: 'gzip'` was set and the warning still appeared four times in a DevServer run.