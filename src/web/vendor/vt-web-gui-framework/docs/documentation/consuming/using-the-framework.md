# Using VtWebGuiFramework in a project

What a project built on the framework needs to know, and where the rest of it is. The readers are the developers of a consuming project and the assistant working in that project's repository.

**The rule pack `vi-webgui` points at this document.** A consuming project enables it from ViAiDevKit and syncs it into its own `.claude/rules/`; the pack names this file as the entry to the corpus and restates the version guard below. Moving, renaming or splitting this file therefore takes a pull request against `plugins/vitronic/_plugins/webgui/rules/webgui-consuming.md`.

## Setting a project up

**The step-by-step guide is the framework's own demo app**, not this corpus: `proj/contents/forDevelopers/yourProject/createNewProject/`, published at [chow.vitronic.de/fordevs/yourproject](https://chow.vitronic.de/fordevs/yourproject). It walks through the IDE, the npm prerequisites, copying `applySettings.js`, `settings.js` and `localSettings.template` out of the framework, and the first build. The essentials it settles:

- **The framework is referenced by a path, not installed as a dependency.** `localSettings.cjs` — per developer, never committed — holds `paths.vtWebGuiFramework` and `paths.vtWebGuiIcons` as relative paths to those checkouts. `settings.js` names the version the project expects, and `applySettings.js` refuses to run when the checkout at that path carries a different one.
- **`applySettings.js` generates and copies.** It writes `package.json` and `tsconfig.local.json` among others, and it runs again after every change to `settings.js` or `localSettings.cjs` — with the `compare` option, so that a project's own modifications are merged rather than overwritten.
- **The framework fixes the Node.js version and the npm install rules.** `settings.packages.nodeJs` names the version, and `applySettings.js` refuses an installed Node.js with a lower minor. It also writes that version as `ExtToolsNode` into the project's `build/<project>_ivy.xml`, from which the build server retrieves it: the framework declares its own Node.js with the private configuration `compile`, which a project does not inherit. A dependency the project enters into that file itself stays; `applySettings.js` rewrites only the entries it writes from the settings. The rules come with the copied `.npmrc` and `package.json`, and they bind a dependency the project adds itself as well:
  - **Only versions older than 14 days** — `min-release-age = 14` makes npm install only versions published more than 14 days ago.
  - **Exact versions** — `package.json` names every dependency with its exact version, and `save-exact = true` writes a new one the same way.
  - **Install scripts only when reviewed** — `strict-allow-scripts = true` fails an install on a package whose install script the `allowScripts` field in `package.json` does not cover. For a package the project adds, its developer examines the script, then runs `npm approve-scripts <pkg>` or `npm deny-scripts <pkg>`.
  - **The build server installs exactly the lockfile** — `npmCommandsForMakefile.cmd` calls `npm ci --omit=optional --ignore-scripts`, and `npm ci` fails where `package-lock.json` does not match `package.json`. The project therefore commits its lockfile after every `npm install`. A project with `localDeps` needs its own lockfile, because the framework's lacks the local tarballs.
  - **The batch file switches first** — `applySettings.js` rewrites it on every run, while `package.json`, `package-lock.json` and `.npmrc` arrive through the compare tool. After taking them over, run `npm install` and commit the lockfile before the next build.
- **A v4 project builds on the CibsJenkins, not on the build machine.** The pinned Node.js 24 needs Windows 10 or Server 2016, and the build machine runs Windows 8.1. The project therefore needs a job of its own on the CibsJenkins. The why: ADR `general-v4-builds-only-on-the-cibs-jenkins.md`.
- **The project's own sources live under `proj/`**, its contents under `proj/contents/`, its static files under `static/` — the paths are `settings.sources`, and they are the project's to choose.

## Moving to a new framework version

The project's copies of `applySettings.js` and `settings.js` stay as they are until it takes them over, since `applySettings.js` copies neither of them. A framework version that fixes one of them reaches the project only through this step.

- **`applySettings.js` is taken over as a whole.** The project replaces its copy with the framework's and changes nothing in it.
- **`settings.js` is reconciled in a diff tool.** The file holds the project's own settings beside what comes with the framework: the code of `getParsedSettings`, and the versions under `settings.packages`, among them `vtWebGuiFramework`, which `applySettings.js` checks against the checkout. The project compares its copy with the framework's, takes over the framework's changes and keeps its own values.
- **Then `npm run applySettings-compare` runs.** It rewrites the generated files and brings the copied ones through the compare tool: `package.json`, `package-lock.json` and `.npmrc`, but also `eslint.config.js`, `webpack.config.js` and the two tsconfig files. `npm install` and a commit of the lockfile follow, as above.
  - **It deletes the files the framework no longer needs**, such as the Buildmachine's `<project>_requires.xml`, `buildnumber.h`, `constants.h` and `buildstamp_<project>.txt` under `build/`, and names each with its reason in the console. The project commits the deletions together with the rest.
  - **The lint uses only the project's packages** — `eslint.config.js` imports its plugins and import resolvers itself, so they load from the project's `node_modules`, even where an import leads into the framework checkout. A project whose copy still names its resolvers under `import-x/resolver` loads them from the checkout's `node_modules` instead, and takes over the framework's `settings` block.

## Hosting the GUI under a sub-path

A web application usually sits at the web server's DocumentRoot. Where one web server hosts several GUIs, each of them gets a sub-path instead — and the project states that sub-path in one place, `settings.targets.web.publicPath`, whose default `'/'` is the DocumentRoot:

```js
publicPath: '/vitronic/vt/mygui',
```

The build derives everything else from it. The chunks and the assets are addressed below the sub-path, and so are the startpage's icon links, the configuration named by `configUrl` and the language files named by `i18nUrl`; React Router takes the sub-path as its `basename`, so a link inside the application produces the right URL and a deep link is matched. At runtime the application reads the same value out of `__webpack_public_path__`, with a trailing slash — which is how a project builds a URL of its own, an OIDC redirect URI for one.

A path that names a backend rather than a place in the distribution stays untouched. `configUrl` and `i18nUrl` may hold either, and the build prefixes only a value that starts with a slash.

**The setting alone is not enough — the web server has to do two things**, and forgetting the second is the common mistake:

1. map the sub-path to the project's `dist/web` directory;
2. rewrite every unknown path below the sub-path to `index.html`, because the application resolves those paths itself. Without this, entering a sub-page or reloading one ends in the web server's own 404. The DevServer does it through `historyApiFallback`.

Two builds ignore the setting: the **DevServer** always serves from its own root, and an **Electron** distribution addresses everything relative to its startpage, which is why `targets.electron` has no `publicPath` at all.

## The security headers the web server has to send

A security test expects a Content-Security-Policy and five headers beside it. The framework delivers the value; **sending the headers is the project's own work**, because only an HTTP response carries them and a built distribution is a set of files.

`settings.targets.web.security` holds the whole value — the policy as one entry per directive, the accompanying headers, and a switch. `applySettings.js` writes it into **`securityHeaders.txt` in the project root**, which is committed and copied into `dist/web` by the build:

```
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; …
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), camera=(), microphone=()
X-Frame-Options: DENY
```

Configure those in whatever web server serves the distribution — Apache, nginx, IIS. The file is deliberately server-neutral: it names the headers and their values and nothing else. `Strict-Transport-Security` stands in it as a comment, because only the installation knows whether it is served over HTTPS.

**Three of the policy's directives are wildcards, and narrowing them is the project's job.** `img-src`, `connect-src` and `frame-src` stand at `*`, because the framework cannot know which origins an application talks to. A scanner reports them as overly permissive; that is accepted until a project replaces them with its own origins.

**`frame-ancestors 'none'` needs a decision before it ships.** It forbids embedding the application in a frame, and it breaks an embedding silently. An application a portal embeds has to widen it to that portal's origin, and drop `X-Frame-Options: DENY`, its legacy companion, with it.

### What the built page delivers on its own

The production build also writes the policy into the startpage as a `<meta http-equiv="Content-Security-Policy">` element, so an installation whose web server sends nothing is not entirely uncovered. That element carries a subset of what a header can, and two limits follow from it:

- **`frame-ancestors` is ignored there, and `X-Frame-Options` has no meta form at all.** The clickjacking protection a security test asks for exists only in the response headers — nothing the build writes can close that finding.
- **Report-only does not work in a meta element.** A browser ignores such a policy entirely, which is why the rollout below runs against the web server.

**Where the web server sends the policy, switch the element off** with `security.deliverCspAsMetaTag: false`. A policy that arrives twice is enforced as the **intersection** of both copies: a directive the element keeps narrow stays narrow however the header widens it. An application that adds `'unsafe-eval'` to its server header for a library therefore stays blocked while the element is in the page — and the server configuration looks correct to whoever reads it.

### Rolling the policy out

The policy is enforcing from the first production build that carries the meta element. Before an application relies on it, walk it once:

1. set `deliverCspAsMetaTag: false` and build;
2. let the web server send `Content-Security-Policy-Report-Only` with the value from `securityHeaders.txt`;
3. walk every screen with the browser console open, and fix or widen whatever it reports;
4. switch the server to the enforcing `Content-Security-Policy` — and the meta element back on, unless the server is the authoritative source.

**The DevServer takes the first pass for free.** It sends the policy as `Content-Security-Policy-Report-Only` while a content is being written, with `'unsafe-eval'` added for its own source maps. That keyword permits neither an inline script nor a foreign origin, so the violations a content can cause still report.

Firefox writes a warning there on every page load: the policy carries no `report-uri`, so it "cannot report violations of this policy". **The warning is misleading** — it means no report is sent to a collecting endpoint. Violations still appear in the console, naming the directive and the blocked resource.

## The browser floor

The framework supports **Firefox 151, Chrome and Edge 111, and Safari 18**, Safari on the Mac, the iPad and the iPhone. Each entry covers every browser that renders with its engine:

- **Chrome** — Chrome on Android, Samsung Internet, Brave, Opera and Android's WebView, all judged by their `Chrome/` version.
- **Firefox** — Firefox on Android as well.
- **Safari** — every browser on iOS and iPadOS, Chrome, Firefox and Edge included: they render with the system's WebKit, and where one sends no Safari version, the start check judges it by the version of iOS.

The floor is set by the dark areas: the framework letters them through CSS container style queries, which need exactly these versions. Below that floor every dark area shows dark lettering on its dark ground. The floor lives in `settings.targets.web.browsers`, and **a project carries its own copy of it in its own `settings.js`**, copied when it was set up: raising the framework's floor does not reach it. Raise the project's list to the same versions when taking the framework version that needs them; the start check then warns a user of an older browser instead of letting the page load wrong. The Electron distribution lies below the floor: its Electron 13 carries Chromium 91, so a desktop build shows every dark area with dark lettering. A page that names the supported browsers reads the list of its own build from `process.env['BROWSERS']`, a JSON string of `[name, minimum version]` pairs, as the demo's features page does.

**Safari deletes what the framework stores** after 30 days of Safari use without an interaction with the site — `localStorage` included, which holds the language, the width of the second sidebar and the VtWebSocket session key. The framework writes every default back, so the one loss a user notices is the session: the next connection logs in anew. *Source: WebKit `ResourceLoadStatisticsStore.cpp` at `main` (30 operating days for a first-party domain since 2024) — checked 2026-09-03.*

## Touch devices

Every function of the framework is reachable by tap on an iPad and an iPhone. Five limits remain, and a project for such devices has to know them:

- **An iPhone needs the configuration of a narrow screen.** The layout does not adapt to the width of the screen: the first sidebar keeps its 180 px and the second sidebar its own width beside the main area, which leaves an iPhone nothing. A project for phones sets `<Menus appearance="hamburgerMenu">` and leaves both sidebars off (`isEnabled="false"` on `<FirstSidebar>` and `<SecondSidebar>`) in its `config.xml`.
- **The date and time field takes no typed input.** Its parts are read-only and react to keys alone, so iOS raises no keyboard for them; a date and a time are set through the calendar and the lists beside it.
- **A range in the calendar moves by taps only**, not by dragging across the days.
- **A hovered appearance stays after a tap** until another element is tapped, because a touch device reports a tap as the mouse entering the element.
- **An Apple Pencil taps, but drags nothing.** A modal window, a scroll thumb, a resize handle and the image of the image viewer move by finger only.

## Reading the ground in a project's own stylesheet

The ground a component sits on is the inherited CSS custom property `--ground`, with the values `light` and `dark`, and it is part of the framework's contract. A project's own component follows the ground the way a framework component does:

```scss
.myLabel {
  color: #001e46;

  @container style(--ground: dark) {
    color: #fafbfc;
  }
}
```

The query tests the element's nearest ancestor, never the element itself; a component that paints a background of its own sets `--ground` on that element for what lies inside it. The full picture: `design/dark-areas.md`.

## How an import finds the framework

The framework's `src` sits on Webpack's module path beside `node_modules` (`resolve.modules`), so a component is imported as if it were a package:

```tsx
import { Button } from 'components/controls/button';
import { Section } from 'components/layouts/section';
import { useI18n } from 'components/hooks/useI18n';
```

Two aliases stand beside it: **`Proj`** for the project's own sources and **`VtWebGuiIcons`** for the icon package. **Every component is imported from its folder**, which exports it by name — never from the file inside, and never as a default export.

## What exists, and what is ported

**A component folder with an `index.ts` is v4 and importable as above.** The five folders without one still hold their v3 JavaScript and are not part of this surface: `controls/stepper`, `indicators/liveTicker`, `indicators/statusMarker`, `popups/login`, `popups/tooltip`.

| Group | Components |
|---|---|
| `controls` | `button`, `checkBox`, `dateTimePicker`, `input`, `link`, `multiSelectBox`, `selectBox`, `switch`, `tabBar` |
| `indicators` | `avatar`, `icon`, `image`, `spinner`, `text`, `valueField` |
| `layouts` | `dataTable`, `mainSection`, `section`, `tabular`, `toolbar` |
| `popups` | `alert`, `card`, `confirm`, `dialog`, `imageViewer`, `menu` |
| `helpers` | `iconForControls`, `labelForControls`, `noticeForControls`, `navigationLink`, `resizeHandle`, `resizer`, `scrollBar`, `scrollButton`, `scrolling`, `sizeMeasurer`, `tablePreparer`, `dynamicHook` |
| `hooks` | `useDimensions`, `useDispatch`, `useDrag`, `useFadeInOut`, `useI18n`, `useInteractions`, `useScrollHandlers`, `useSelector`, `useStylingProps`, `useThrottledCallback`, `useVtWebSocketDatabase`, `useVtWebSocketDatabaseFilters`, `useVtWebSocketDatabaseSort` |

## Where a component's props are documented

**In the component's own `<name>.types.ts`**, one JSDoc block per prop, beside the component. The framework is consumed as a source tree, so those files are in the consuming project's reach — reading them is the API reference. There is no generated documentation and no second place that describes a prop; a prop's description is written where the prop is declared.

Many components additionally take **styling props** — grid placement, spacing, a background colour — and each of them states which ones in its `<name>StylingProps` list (25 components carry such a list today). A component without one takes none. **The list is binding:** a styling prop outside it takes no effect, even where it belongs to a group with one inside it — a listed `padding` does not carry an unlisted `borderRadius` along, a listed `backgroundColor` no unlisted `backgroundImage`.

## Identifying a component

**`id` is an HTML ID and nothing else.** A component writes it to the attribute `id` in every build — a control on its focusable element, a `Dialog` on its dialog box, every other component on its outer element — so that an automated test finds it. It has to be unique in the whole document. IDs starting with `viwgf_` belong to the framework, which gives its own elements fixed ones: `viwgf_headerLogo`, `viwgf_primaryHeader_<menu node ID>`, `viwgf_megaMenu_<menu node ID>`, `viwgf_firstSidebar_<menu node ID>`, `viwgf_secondaryHeader_<menu node ID>`, `viwgf_primaryHeader_hamburgerIcon` and `viwgf_secondaryHeader_selectLanguage`, the menu node ID as it is configured. The scrolling root of a content — an `Article`, or a `MainSection` with scroll bars — is `viwgf_mainScope_<menu node ID or URL path>` in the main area and `viwgf_modwin_<modal window ID>` in a modal window.

**Components that share one event handler are told apart at the call site.** A callback reports what happened — the event, and a value where there is one — but not which component reported it. A call site that shares logic between components passes what tells them apart through an arrow function of its own, typed like any other argument. The React Compiler compiles a project's contents as well, and it keeps such a function's identity as long as the values it captures keep theirs. Where the handlers share nothing, one handler per component reads plainer than a switch over a tag.

```tsx
const step = (delta: number) => {
  setStepValue((prevValue) => (prevValue + delta));
};

<Button
  icon="ADD"
  onClick={() => {
    step(1);
  }}
/>
<Button
  icon="REMOVE"
  onClick={() => {
    step(-1);
  }}
/>
```

A component ignores a `data-*` attribute set on it. TypeScript does not report one either, because it checks no hyphenated attribute name against the props.

A callback that reports an element *inside* the component keeps its own field for it: the tab's `id` in the `onClick` of a tab, `menuItemId` in the `onClick` of `Menu`, the image ID in the `onSelect` of `ImageViewer`.

## Typing the storage values

The keys of the storage are declared in the project's `config.xml`, so only the project knows the types of their values. It states them once, by augmenting the interface `StorageValues` of `store/storage/storage.types` in a module of its own that its `tsconfig` covers — one entry per key, and for a group an object of its sub-keys:

```ts
// proj/storageValues.ts
declare module 'store/storage/storage.types' {
  interface StorageValues {
    simpleNumber: number;
    vehicleData: { webSocketUrl: string };
    // a group that starts empty: each sub-value is undefined until it is written
    usLoc: { tableStayOnTop?: boolean };
  }
}

export {};
```

`storageSlice.selectValue` and `storageSlice.setValue` take their types from it, so no call site states a type and the compiler checks every write against the reads:

```ts
const count = useSelector((state) => storageSlice.selectValue(state, 'simpleNumber')); // number
dispatch(storageSlice.setValue('simpleNumber', '46')); // error: string is not number
dispatch(storageSlice.setValue('vehicleData', 'webSocketURL', 'ws://…')); // error: unknown sub-key
```

**The declaration is optional, per key.** A key the project does not declare falls back to the type its call site states — `const text: string = useSelector((state) => storageSlice.selectValue(state, 'other'));` — and to `unknown` without one. Two things the declaration does not check: a misspelt key, which falls back like an undeclared one, and whether `config.xml` gives the key a value of the declared type. The framework's own declaration for its demo configuration is `proj/storageValues.ts`. Rationale: ADR `PDWG-111-storage-values-typed-by-an-augmentable-map.md`.

## Initializing a project's own slice

A slice that has to act once the store runs, to create a storage connection or to register a listener at an interface, does so in `startInitialListener` from `store`. Its effect runs exactly once, with the first action dispatched after the call. **A listener that matches every action and only unsubscribes itself in its effect can run twice.** The listener middleware runs the listeners of an action from a copy of its list. When a listener earlier in that copy dispatches synchronously, the nested action runs it first, and the outer action runs it again from its copy.

## Reading the logs of a slice

A slice that reports what went wrong keeps it in a `logs` array of `LogEntry` (`store/store.types.ts`), readable through the slice's `selectLogs`. The three WebSocket slices keep one such array per WebSocket ID. **Every log is capped:** it holds the last 200 entries, and a text longer than 1000 characters is cut there and closes with its original length, as in `… (48213 characters)`. A project's own slice appends with `pushLogEntry` from `store`, which applies the same caps. Rationale: ADR `general-slice-logs-capped-in-one-helper.md`.

## When the WebSocket connections open

The WebSocket support loads only in a project that imports it, so the connections of `config.xml` open with that import and not when the application starts. **A project that uses the VtWebSocket interface needs nothing extra:** `store/vtWebSocket/vtWebSocketConnections` and the `useVtWebSocketDatabase*` hooks load the connections and open those marked `autoOpen="true"`. A project with plain connections imports `store/webSockets`, which it needs anyway for their messages. A login page that needs an open connection gets one by importing either (`architecture/vt-web-socket.md`). Rationale: ADR `general-websocket-slices-load-with-their-first-use.md`.

## Configuring and serving a WebSocket connection

A `<WebSocket>` under `<WebSockets>` in `config.xml` names its server in one of two ways. Text inside the element is taken as the complete URL. Without text, the framework builds the URL from the page: `hostname` and `port` default to the page's own, `path` is appended, and the scheme follows the page — `wss:` on an `https:` page, `ws:` on an `http:` one (`src/store/webSockets/utils/createInitialState.ts`).

**Leave `useSsl` unset.** The attribute forces the scheme, `true` to `wss:` and `false` to `ws:`. On an `https:` page, `useSsl="false"` opens a `ws:` socket, which every browser blocks as mixed content.

**Certificates and the web server are the project's, but the socket needs three things from them:**

- **One scheme for page and socket** — which the default gives.
- **A certificate the client trusts at the level of its operating system.** Safari never extends the exception a user grants on its warning page to a `wss:` socket, so the socket connects only once the root that issued the certificate is trusted on the device: "Always Trust" in Keychain Access on a Mac, an installed profile plus Settings → General → About → Certificate Trust Settings on an iPad or an iPhone. That list shows only the root of a certificate authority, so a self-signed server certificate can never be trusted on an iPad. Apple further demands a key of at least 2048 bits and the host name in the Subject Alternative Name, and it rejects a certificate valid for more than 825 days — reportedly one from a private certificate authority as well. The socket usually runs on a port of its own on the page's host, as in the shipped `config.xml`; its server has to present a certificate for that host name as well.
- **HTTP/1.1 for the socket, or a server that accepts the extended `CONNECT`.** Safari 26 opens a WebSocket over HTTP/2 where the server offers it, and its first builds broke the handshake against servers that refuse that method.

**A rejected certificate looks like a network failure.** A browser reports no cause for a failed WebSocket, so the framework can only narrow it down. A `wss:` connection that fails before it was ever open logs an untrusted certificate or an unreachable server as the likely cause; once a connection has been open, its certificate is no longer in question, and a later error logs the general interruption. Both go to the log of `store/webSockets` (`selectLogs`), and what a user sees of them is the project's decision. The connection retries only where `autoReconnect` is set, and each attempt waits twice as long as the one before, up to a minute or the configured delay if that is longer, so a certificate that is never trusted does not keep it retrying at the configured rate.

*Source: WebKit bug 41419 (certificate exception not applied to WebSocket); Apple support articles 103769 (requirements for trusted certificates) and 102390 (trusting installed profiles); WebKit blog, WebKit Features in Safari 26.0 — all checked 2026-09-03.*

## Which VtWebSocketSpec the framework implements

A project that talks to a server through the VtWebSocket interface depends on the version of its specification, VtWebSocketSpec. **Each framework version implements exactly one**, and names it in `settings.js` as `packages.vtWebSocketSpec`, beside the other versions it comes with. A project's copy of `settings.js` carries the entry of the framework version it was copied from.

The entry is the answer to which VtWebSocketSpec a framework version follows — a server built to a different version may answer in ways the framework does not read. It is a specification and not a dependency: nothing is installed, loaded or checked for it. What the slices and hooks make of the specification is described in `architecture/vt-web-socket.md`. Rationale: ADR `general-vtwebsocket-spec-version-in-settings.md`.

## The rules a consuming project has to follow

These are not house style. A project that ignores them produces a UI that reads wrong beside the rest:

- **The content contract** — a content's entry file, its two render modes, what a `Dashboard` returns: `architecture/contents.md`.
- **Colour semantics** — the attention ladder, the signal colours and the interaction colour never substitute for each other: `design/colors.md`.
- **Dark areas** — the framework is light; a component takes the ground of the area it is placed in by itself, and a popup stays light whatever it covers: `design/dark-areas.md`. `darkTheme` exists only where the ground cannot be derived: on `Section` and `ValueField` for a background image, and on the overlaid `Button`.
- **Unique IDs** — every `id` is an HTML ID and has to be unique in the document, and the prefix `viwgf_` is the framework's; a shared handler tells its callers apart by a closure at the call site: [Identifying a component](#identifying-a-component).
- **The controls' base design** — what a pane, a status and the interaction appearances mean, so that a project's own component can be built to match: `design/controls.md`.
- **Running text keeps to the reading measure** — `Confirm`, `Alert` and the error screen cap their text at `typo.measure` (65ch) by themselves; `Dialog` and `Card` do not, their content being the project's. A project's own dialog with running text caps its column the same way, with `<Section maxWidth="textColumn">`: ADR `general-running-text-capped-at-the-reading-measure.md`.
- **Notifications are for special situations** — rare or absent in the normal case; a message about a content belongs in that content. A stack taller than the space below the header is cut off at the top rather than scrolled, and its oldest notifications come back as the newer ones go: ADR `general-notification-stack-clips-instead-of-scrolling.md`.

The configuration a project ships — `static/config/config.xml`, its menu, its languages — is described in `architecture/configuration.md`.
