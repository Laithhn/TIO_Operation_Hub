# Contents

A **content** is a unit of project-supplied UI the framework loads dynamically at runtime. Contents are never imported: the framework resolves them from a path and pulls them in via a dynamic `import()`, so a project adds a content by placing a file and naming it in the configuration — no framework code changes.

## Where contents live

All contents live under **`proj/contents/**`**, and `content.tsx` occurs nowhere else in the repository. The build injects the absolute path as `process.env.PATH_CONTENTS` (`webpack.config.js`, from `settings.sources.project.absPathContents`), and every loading site prepends it to the configured path. Consequently a `<Content>` path in `static/config/config.xml` is **relative to `proj/contents` and carries no file name** — `/examples/dataTable` resolves to `proj/contents/examples/dataTable/content.tsx`.

A content's folder holds its entry file plus whatever it needs privately: sub-components, a reducer, SCSS, JSON data.

## Two kinds of entry file

| File | Default export | Purpose |
|---|---|---|
| `content.tsx` | a React component | UI, mounted into one of the five mount points below |
| `content.ts` | a `JsContentFunc` | no UI at all — code executed on a menu click, receiving the store (`dispatch`, `getState`, `subscribe`) plus the caller's id and options |

`content.ts` is reachable from **secondary menu nodes only** (`scope="js"`) and is the rarer case; `proj/contents/extras/menuAppearance/content.ts` is the one instance. Its type is defined in `src/app/modules/content/content.types.ts`.

## The contract of a `content.tsx`

- **A default export** — every mount point imports the module and renders `module.default`.
- **`displayName` is `Dashboard` or `Article`**, matching the component's own name. It is not decoration: it selects the render mode, and **every mount point validates it** and fails the load otherwise.
- **No props.** No mount point passes anything but `ref`, and only the main-scope loader does even that. A content component therefore declares no props — and needs **no `content.types.ts`**. Types a content needs privately sit in `content.tsx` itself; sub-components and reducers in the same folder keep their own `*.types.ts`.

```tsx
const Dashboard = () => (
  // …
);

Dashboard.displayName = 'Dashboard';

export default Dashboard;
```

### Dashboard vs. Article

`src/app/modules/content/Content.tsx` reads `module.default.displayName` and derives the content type from it:

| `displayName` contains | Content type | Rendered as |
|---|---|---|
| `Dashboard` | `dashboard` | a plain `dashboard` container |
| `Article` | `article` | wrapped in `Scrolling` — vertical scrolling, key handling, back-to-top button, restored scroll position |
| neither | — | the load throws, and the frame shows the error screen |

The match is a **case-insensitive substring test**, so the error message says the name "must contain" one of the two. The convention is stricter than the mechanism: name the component exactly `Dashboard` or `Article`.

**`Article` is available in the main scope and in modal windows only.** The three slot mount points — footer and both sidebars — render their content as a dashboard and accept nothing else.

Two further content types exist but are not produced by a content file: `iframe`, when the configured path is an `http(s)` URL, and `error`.

Articles that carry translated prose split it per language into `De.tsx` / `En.tsx` and switch with `lazy()` — see `proj/contents/overview/start/`.

### A Dashboard returns one `MainSection`

**`MainSection` is a Dashboard's root element, always and alone** — never a fragment with siblings beside it. Everything the content shows sits inside, the toolbar included:

```tsx
<MainSection gridTemplateRows="auto 1fr">
  <Toolbar title="…" />
  {/* … */}
</MainSection>
```

`MainSection` is what makes the container usable: it claims `min-height: 100%` of the `dashboard` container, carries the padding that separates the content from sidebars and footer, and — with `scrollBarV` / `scrollBarH` — is the scrolling element that restores its position across content changes, keyed by the caller id it reads from the content context. A sibling rendered beside it is outside all of that and pushes the section past the container's bottom edge.

**A `Toolbar` therefore lives inside the `MainSection`**, as one of its grid rows (`gridTemplateRows="auto 1fr"`) or nested in a `Section`. This is where v3 differed: there, a content returned either `<><MainToolbar/><MainSection/></>` or a bare `<MainSection/>`, the toolbar being a sibling. **v4 has no `MainToolbar`** — `components/layouts/toolbar` replaces it, and it is a child. Every port from v3 has to restructure accordingly.

## Mount points

| Mount point | Configured in `config.xml` | Loaded by | Accepts |
|---|---|---|---|
| Main scope | a **primary** menu node's `<Content>` | `app/modules/content/Content.tsx` | `Dashboard`, `Article` |
| Modal window (modwin) | a **secondary** menu node's `<Content>`, or opened from a content | `app/modules/content/Content.tsx`, via `modwins/modwin/Modwin.tsx` | `Dashboard`, `Article` |
| Footer | `<Footer><Content>` | `app/modules/footer/Footer.tsx` | `Dashboard` |
| First sidebar | `<Sidebars><FirstSidebar><Content>` | `app/modules/firstSidebar/contentScope/ContentScope.tsx` | `Dashboard` |
| Second sidebar | `<Sidebars><SecondSidebar><Content>` | `app/modules/secondSidebar/contentScope/ContentScope.tsx` | `Dashboard` |

The split is deliberate: the main scope and modal windows both go through the **`content` app module**, which owns content loading, the content type, the content context, and the error screen. The three slots each load directly in their own app module, because they render a fixed, always-dashboard container and need none of that machinery.

**The three slot contents are optional, at two independent levels.** Whether the section exists at all is owned by the **app slice** (`src/app/app.slice.ts`) as `isFirstSidebarEnabled`, `isSecondSidebarEnabled` and `isFooterEnabled`: initialized from `isEnabled` on `<FirstSidebar>`, `<SecondSidebar>` and `<Footer>`, and toggleable at runtime through the slice's `enable*` / `disable*` actions — so a section is not fixed by the configuration, which supplies initial values only ([configuration.md](configuration.md)). `App.tsx` reads the three selectors and renders accordingly. Whether an enabled section carries a content is decided by its `<Content>`, which all three slot modules read as an optional node — an absent or empty one loads nothing, raises no error, and never reaches the `displayName` validation. What remains then differs per slot: without a content there is **no footer at all** (`Footer.tsx` returns `null` — "No content, no footer!"), while a sidebar still renders its title and menu and merely omits its content scope. The shipped `config.xml` has exactly that case in `<FirstSidebar>`: enabled and titled, with an empty `<Content/>`.

They differ in how a failed load surfaces, each following its module's existing error channel:

| Loaded by | A rejected import or an invalid `displayName` |
|---|---|
| `content` module | dispatches a content error, and the frame renders the error screen |
| `footer` module | dispatches `SliceStatus.ERROR` with the message on the footer slice |
| both `*Sidebar` modules | throws |

## How a content is triggered

`ContentScope` in `src/store/menus/menus.types.ts` — `'main' | 'modwin' | 'js' | 'blank'` — is a property of a **menu node**, and `src/store/menus/utils/parseScope.ts` decides it structurally rather than by configuration alone:

- **A primary menu node always has scope `main`.** `parseScope` returns `'main'` for any non-secondary node and a `scope` attribute is not even read for the primary menu. The main scope is therefore fed **exclusively** by the primary menu.
- **A secondary menu node never has scope `main`.** It takes `js` or `blank` when the attribute says so, and otherwise defaults to `modwin` — so a secondary menu node either opens a modal window, executes a `content.ts`, or opens a URL in a new browser tab.

| Scope | Effect |
|---|---|
| `main` | loads the content into the main scope, via navigation |
| `modwin` | opens the content in a modal window |
| `js` | imports `content.ts` and calls its default export — no UI |
| `blank` | `window.open()` on the path, for an external target |

### What a `contentPath` may be

A menu node's `contentPath` does not have to point at a content at all:

| Value | Scope | Result |
|---|---|---|
| a path relative to `proj/contents` | `main`, `modwin` | the project content is loaded |
| an `http(s)` URL | `main`, `modwin` | the page is embedded in an `iframe` — content type `iframe`, no content file involved |
| an `http(s)` URL | `blank` | the page opens in a new browser tab |
| a path relative to `proj/contents` | `js` | the `content.ts` function is executed |

The main scope and modal windows are therefore **not restricted to project content files**, even though a content file is the normal case.

### Modal windows opened from a content

Beyond the menus, **a content can open a modal window itself** by dispatching the `modwins` slice's `startLoadingContent` with the target content's path. No project content in the repository does so today; `src/index.tsx` carries a commented-out example that dispatches it from outside the app.

## Where the loading actually happens

One asymmetry is worth knowing, because the module layout suggests otherwise: the `content` app module dynamically imports **`content.tsx` only** (`Content.tsx`). The `content.ts` import for scope `js` sits in the secondary menu instead — `src/app/modules/header/secondaryHeader/menuNode/MenuNode.tsx` — and the `content` module contributes only the `JsContentFunc` type. So all five *component* mount points are covered by the table above, while function contents are loaded by the menu node that triggers them.
