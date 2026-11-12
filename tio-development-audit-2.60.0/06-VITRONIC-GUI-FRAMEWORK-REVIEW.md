# 06 — VITRONIC GUI framework review (build 2.60.0)

## Direct answer

**Does the current GUI framework help or limit the quality of the TIO Operations Hub? — Both; on balance it now helps the look and consistency, and it limits accessibility, interaction quality and delivery risk.**

The first audit found no framework at all (a screenshot imitation). That has changed: **VtWebGuiFramework 4.0.0-rc.5 and VtWebGuiIcons 2.4.0 are vendored unmodified** in `src/web/vendor` (1,000 files, 7.4 MB) and the application adopted the framework's tokens and density in full (A68). This review therefore assesses the real framework as it is used here. I reviewed its tokens, the components the application imports, and the project's own adoption documents; I did not review all framework source.

### Where it helps

- **One visual language** shared with other VITRONIC products: official logo, fonts, icon set (366 icons), colour and spacing tokens. The two competing styles of 2.29.0 are gone.
- **Readable scale**: 17 px root, 28 px controls, generous spacing.
- **Less bespoke CSS to justify**: design decisions are inherited instead of estimated from a picture.

### Where it limits

| Limit | Evidence | Consequence |
|---|---|---|
| **Core widgets are not accessible as shipped** | Project decision A69: the framework DataTable is "a virtualized grid of divs" with "no table roles", "sorts by mouse only" and "cannot be changed (vendored unmodified)"; its column-search field "cannot be named". A68: buttons, inputs, selects and tables "keep form and accessibility semantics" by staying **native** and merely styled like the framework. Only 38 `aria-`/`role=` occurrences were found in the framework's component sources | The team uses the framework mostly as a **stylesheet**. Of its components only TabBar, StatusMarker, ValueField, Spinner, Toolbar, Card and icons are used, and TabBar needed a wrapper for `aria-selected`, keyboard activation and named scroll buttons |
| **A token fails contrast** | Attention/link colour `#007db3` on `#fafbfc` = 4.42:1 (axe). Contrast failures rose from 81 nodes on 26 screens (2.29.0) to **243 nodes on 38 screens** | WCAG 1.4.3 not met through an inherited token the application is not supposed to change |
| **No modal focus management** | Tab leaves open dialogs (probe) — the framework Card/popup offers no focus trap and none was added | WCAG 2.4.3 pattern not met |
| **Density "as shipped"** | 46 px header + toolbar strip + 180 px sidebar + fixed footer; four ticket rows visible at 1366×768 | Less working area for list-heavy operational work (037) |
| **Release-candidate dependency** | Version `4.0.0-rc.5`; the framework requires icons `4.0.*` but only 2.4.0 was available (`VENDOR.md`); 3.6.1 was replaced by the RC on the same day | Unreleased base under a business application; re-vendoring needed at 4.0.0 |
| **Integration cost** | The framework is built for webpack; a custom Vite plugin (`vt-framework.ts`) reproduces module paths, CSS-module handling, SVG loading and `process.env` values; Redux and other dependencies are covered by shims | Fragile build coupling to framework internals; upgrade effort each release |
| **Bundle weight** | Entry script 900.6 kB against a budget raised from 900 to 902 kB to fit (TEST-RESULTS) | No headroom |
| **Style constraints** | Uppercase buttons, underline inputs, no radius, no elevation (A103 asks the owner to confirm this direction) | Conservative look; lower legibility of long button labels |

## Assessment by criterion

| # | Criterion | 2.29.0 | 2.60.0 | Notes |
|---|---|---|---|---|
| 1 | Visual design quality | Weak–adequate | **Adequate–good** | Coherent corporate style |
| 2 | Typography | Weak | **Adequate** | Good base size; 30 computed sizes from mixed rem/px; uppercase controls |
| 3 | Spacing system | Adequate | **Good** | Token-based |
| 4 | Component consistency | Adequate | **Good** | One style everywhere |
| 5 | Navigation patterns | Weak | **Adequate** | Fits all widths; still three layers of chrome plus footer |
| 6 | Form design | Adequate | **Adequate** | Native controls styled as framework; underline inputs have weak affordance |
| 7 | Data tables | Adequate | **Good (application's own)** | The good table is the hub's native table, not the framework's |
| 8 | Dashboard components | Good | **Good** | Application-built |
| 9 | Dialogs and notifications | Adequate | **Adequate** | No focus trap, no toast for success |
| 10 | Responsiveness | Weak | **Good** | Achieved by the application (drawer, More menu, row disclosure), not provided by the framework |
| 11 | Accessibility | Weak–adequate | **Weak–adequate** | Semantics kept by avoiding framework widgets; contrast worse |
| 12 | Interaction efficiency | Adequate | **Adequate** | Better actions; lower density |
| 13 | Maintainability | Weak | **Adequate with risk** | Facade (`src/vt/index.ts`) isolates imports — good practice; RC version, custom build plugin and 1,000 vendored files are the risk |

## Origin of recurring weaknesses

| Weakness | Framework component | Framework convention/token | Page implementation | Misuse |
|---|---|---|---|---|
| Contrast failures | | ✔ `#007db3` | | |
| Dialog focus escapes | ✔ popup/Card | | ✔ not compensated | |
| Low rows per screen | | ✔ density | ✔ stacked bands | |
| Uppercase, underline inputs | | ✔ | | |
| Stage names in messages, date formats | | | ✔ | |
| Div-based widgets avoided | ✔ | | (worked around correctly) | |

## Recommendation

| Option | Assessment |
|---|---|
| **A. Keep the framework as the visual layer, keep native controls, and close its gaps upstream** | **Recommended.** Raise three defects with the framework owners: link/attention contrast, accessible DataTable (roles, keyboard sort, nameable search), modal focus trap. Until fixed, apply application-level overrides (darker link token, focus trap in the hub's dialog) and document them as deviations |
| B. Replace with a third-party suite | Not justified: the application already carries the accessible parts itself, brand consistency would be lost, and every page would be touched again within weeks of the last rebuild |
| C. Adopt more framework components (DataTable, SelectBox, Button) | Not recommended until they meet WCAG 2.2 AA; A69 already reversed one such attempt |

Further actions: move to the released 4.0.0 with matching icons before production; add an automated accessibility gate so framework upgrades cannot regress; offer a compact density for lists; ask the owner to confirm A103 with the contrast evidence attached.

## Components to redesign or fix first

1. Link/attention colour token (framework) — one change removes most contrast failures.
2. Dialog (hub wrapper) — focus trap, return focus, unambiguous buttons.
3. List page layout — compact density, collapsible filter band, no fixed footer on small heights.
4. Framework DataTable and SelectBox (upstream) — accessibility before any wider adoption.
