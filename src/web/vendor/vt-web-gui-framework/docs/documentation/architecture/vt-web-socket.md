# VtWebSocket interface

VtWebSocket is a JSON API over a WebSocket connection: the frontend queries data sources on a server, sets their options and receives their answers and pushed changes. **Its specification lives outside this repository**, in the `VtWebSocketSpec` repository as `docs/vtwebsocketspec/documentation/VtWebSocketSpec.md`, which states its version in its head.

**The framework implements exactly one version of the specification**, and the entry `packages.vtWebSocketSpec` in `settings.js` names it — the one place that does. A change that makes the code follow a newer version raises the entry in the same commit. Its comment marks it as a specification and not a dependency: the build installs, loads and checks nothing for it, and the code does not read it. ADR [general-vtwebsocket-spec-version-in-settings.md](../../decisions/general-vtwebsocket-spec-version-in-settings.md).

*Source: VtWebSocketSpec repository, `documentation/VtWebSocketSpec.md`, version 1.8.0.*

**A consumer project may use the interface, and nothing forces it to.** It is switched on per connection, by the `server` attribute of a `<WebSocket>` node in `config.xml`: `vtWebSocket`, `vtwse` and `vtWebSocketEngine` all select it, case is ignored, and every other value leaves the connection on `notSpecified`. Such a connection carries no protocol — the consumer receives its raw messages through the `receiveMessage` action of `store/webSockets` and interprets them itself. How the configuration reaches a slice at all: [configuration.md](configuration.md).

## The four layers

| Layer | Where | What it does |
|---|---|---|
| Socket | `src/interfaces/webSocketItf/` | wraps the browser's `WebSocket`, reconnects automatically, and calls the four listener types `onStatusChanged`, `onSend`, `onMessage`, `onError` |
| Connection | `src/store/webSockets/` | creates, opens and closes connections and holds their status — no protocol knowledge |
| Protocol | `src/store/vtWebSocket/vtWebSocketConnections/` | sorts incoming messages into `info` and `update`, answers the fixed sources `API` and `AUTH` itself, and offers one `send*` reducer per source handler |
| Sources | `src/store/vtWebSocket/vtWebSocketDatabases/`, `.../vtWebSocketReports/` | the datasets, layouts and filters of database sources; the traffic statistics per source |

The slices reach the socket through the `webSocketsApi` facade, which sends **past Redux** — an outgoing message is not an action, and only its trigger is.

## When the connections open

**Every WebSocket slice hangs itself into the store when its module is first imported**, through `rootReducer.inject`, so a project that uses no WebSocket loads none of them. The first action after `store/webSockets` was imported creates the connections of `config.xml` and opens those marked `autoOpen="true"`. **`autoOpen` therefore opens a connection once the WebSocket support is loaded, not when the application starts.**

**The protocol layer loads the connection layer.** It takes the status of a connection from the action `receiveStatus` of `store/webSockets`, and `server` and `useAuth` from the connection's settings there. A project that uses the VtWebSocket interface, through `store/vtWebSocket/vtWebSocketConnections` or one of the `useVtWebSocketDatabase*` hooks, gets its connections opened by that import alone. A project with plain connections imports `store/webSockets` itself, which it needs anyway to receive their messages through `receiveMessage`. ADR [general-websocket-slices-load-with-their-first-use.md](../../decisions/general-websocket-slices-load-with-their-first-use.md).

**A protocol layer loaded late catches up.** With the first action after its import, it takes over the current status of every VtWebSocket connection that has left `closed`. A connection that opened before the protocol layer was loaded thus still starts its conversation with the server.

## What happens without the consumer's doing

The moment a connection to a VtWebSocket server reaches the status `open`, the protocol layer starts the conversation on its own:

1. `{"query": "API"}` — the server's name and version, which land in `serverInfo`, plus its project-specific `system` object, which lands in `systemInfo`.
2. With authentication enabled for the connection: `{"set": "AUTH", "push": true}` followed by `{"query": "AUTH"}`, the latter carrying a stored `session_key` when one exists.
3. `{"set": "*", "cache": true}` — sent immediately when the connection uses no authentication, and after a successful login when it does.

**Session keys survive a page reload.** Every `info` answer of the `AUTH` source writes its `session_key` into the browser's local storage, under the reserved storage key `webSocketSessionIds` and keyed by the WebSocket ID. The same answer refreshes the module-level copy the slice holds, so a log out empties both rather than leaving the previous key behind.

**The key is read where an authentication is sent, not where a connection is created.** The storage answers asynchronously, and a connection can be created before it has: its first status change arrives while the socket is still `connecting`, which is within the same synchronous run that opened it. Reading the key only when the connection reaches `open` — or when a consumer asks for an authentication — leaves the storage the milliseconds it needs.

**The views a user can reach come from two places, and `selectViews` merges them on purpose.** The `system` object of the `API` answer may carry a `views` array: those views belong to the installation, hold for every user, and arrive before any login. A successful login adds the `views` of the `AUTH` answer on top. Only the second half is specified — `system` is free-form by section 3.1, so its `views` is a project convention, and the selector drops whatever is not a string.

**No version is checked here.** The `major` and `minor` of the `API` answer are kept in `serverInfo` and compared against nothing. Section 3.1 names backward compatibility as the point of that query, and which versions a project accepts is the project's own matter: a consumer reads `selectServerInfo` and decides for itself. What the framework offers instead is the verifier below, which judges the `system` object rather than the version.

`selectServerStatus` folds connection status, API answer and login status into the single value a consumer reads — `notConnected`, `connected`, `invalid`, `notAuthenticated`, `interrupted` or `ready`. It takes an optional verifier function for `systemInfo`, which is what turns a reachable server into an `invalid` one.

## How a message goes out

Every `send*` reducer follows one pattern. Its `prepare` validates the arguments and writes the outcome into the action's `error` field, where three values mean three things: `false` for a valid message, a string for a rejected one, and `true` for an unusable WebSocket ID. The reducer itself sends nothing — it writes a log entry into the slice's `logs` when `error` is a string, and stays silent when it is `true`. A listener with the predicate `action.error === false` is what actually puts the message on the wire.

**Data the framework does not interpret are any JSON value.** Two reducers carry such data: `sendUpdateData` with the `data` of an `update`, and `sendQueryRest` with the `post_data` of a REST query. Both take text, number, boolean, `null`, array and object alike — the type `NestedData` names that set. It is drawn where it is because the payload lives in the store and goes out through `JSON.stringify`: a `Date`, a `Map` or an `undefined` would not survive either, so such a value is refused with an `error` entry in the logs instead of being dropped from the message.

Each slice keeps its own `logs` array per WebSocket ID, readable through its `selectLogs`. Like every log of a slice, it holds the last 200 entries and cuts a text after 1000 characters, because every entry goes through `pushLogEntry` (`src/store/pushLogEntry.ts`). An unknown message is logged with its whole content, so the cut reaches it first.

## Using a database source

`initDatabase` requests the layout `<name>.layout` unless it is already known, `startDatabase` applies the modified filters and a sort that is not empty and sends `{"set": <db>, "push": true}` plus a first query, and `stopDatabase` sends `{"set": <db>, "push": false}`. **A consumer normally does none of this by hand: the hook `useVtWebSocketDatabase` counts the subscriptions of a database and calls the three in the right order**, and it shapes `requestDatasets` the way `<DataTable>` expects it.

**The filters of a database are the second hook's, `useVtWebSocketDatabaseFilters`.** It picks the set action by the type the layout gives a filter, resets one or all of them, and applies the changes throttled — optionally at once after every change, and optionally requesting datasets again afterwards. Its functions take the ID of a filter together with its new value; where both come from is up to the caller.

**The sort of a database is the third hook's, `useVtWebSocketDatabaseSort`.** A layout lists its `sorters`, each with an ID and the values it takes, like `ASC` and `DESC`. A sort is a list of entries, each naming a sorter and one of its values, in the order of their priority; an empty sort leaves the order to the server. The hook sets, resets and applies it — optionally at once after every change, and optionally requesting datasets again afterwards, since a new sort discards the order the datasets in the store came in. Its `sortBy` takes the ID of a sorter and a value, and sorts by that one sorter. `setSort` refuses a sorter the layout does not list, a value the sorter does not take, and a sorter named twice, each with an `error` entry in the logs. A sort that has to be in place when the database starts is set in the `dispatchInitialSettings` callback of `useVtWebSocketDatabase`, and `startDatabase` sends it before the push.

**An empty sort returns to the order of the server.** `resetSort` followed by `applySort` sends `{"set": <db>, "sort": []}`, and a server reads the empty list as no sort at all. The specification defines no reset of a sort, and it does not state this meaning of an empty list yet. `startDatabase` sends no empty sort, since a database starts in the order of the server anyway. ADR [general-vtwebsocket-empty-sort-returns-to-the-server-order.md](../../decisions/general-vtwebsocket-empty-sort-returns-to-the-server-order.md).

**A sorter ID is no field ID.** What a sorter sorts by is agreed between the source and the project that uses it, and the framework assumes nothing: the content ties a sorter to a column, for instance to the `sortOrder` and the `onClick` of a header cell of `<DataTable>`. ADR [general-vtwebsocket-sort-has-a-hook-of-its-own.md](../../decisions/general-vtwebsocket-sort-has-a-hook-of-its-own.md).

**No hook keeps the filter values or the sort.** They live in the slice — as `value`, `appliedValue`, `isDefault` and `hasChanged` per used filter, and as `value`, `appliedValue` and `hasChanged` for the sort — which is what lets a second consumer of the same database see the same status.

**A layout keeps the structure, not the presentation.** Of a field it keeps `id`, `type`, `isKey`, `editable` and `visible`, and adds the index a dataset array is read by; of a filter it keeps `id`, `type`, `usepattern`, `ops` and the default values. `ops` counts at numeric filters only: a text filter has none, so the operators the VtWebSocketEngine sends with one, like `["=","<>","LIKE"]`, are ignored. The labels stay out on purpose, because visible text comes from the i18n slice — ADR [general-vtwebsocket-no-backend-labels.md](../../decisions/general-vtwebsocket-no-backend-labels.md), which also covers `src`, `tooltip` and `proc`. A field that omits `visible` counts as visible, and the framework acts on the flag nowhere by itself: `selectIsFieldVisible` hands it to the GUI, which decides.

**A field's `editable` flag is enforced.** An edit of a field the layout marks as not editable never reaches the server, and neither does an edit naming a field the layout does not know; both are refused with an `error` entry in the logs. The specification lists `editable` among a field's keys without marking it optional, so a layout that omits it is covered by neither reading — here such a field counts as editable.

**A layout is accepted only when exactly one of its fields carries `isKey: true`.** Without it — or with several — the whole layout is discarded with an `error` entry in the logs, and the database never becomes usable. The key field's position decides how a dataset array is read, so no default can stand in for it.

**Filters are read flat, from either form.** A layout answer carries its filters as a flat `filters` array or as `filtergroups`, whose entries group filters under a label, and the specification allows only one of the two. The filters of every group join the list in the order of the groups. The grouping itself stays out: a group has no ID but its label, and labels are not read, so a GUI arranges its filters itself, as it supplies their texts. A layout that carries both keys anyway is read with both and logs a warning. A filter ID that occurs twice keeps its first entry, with a warning as well. ADR [general-vtwebsocket-filter-groups-read-flat.md](../../decisions/general-vtwebsocket-filter-groups-read-flat.md).

**A `date` filter is a numeric filter.** The specification lists the filter types `int`, `text`, `select` and `mselect`, while the VtWebSocketEngine delivers `date` as well, and the specification's owner confirms it. Such a filter is read, set and sent exactly like an `int` filter, its operators and `setNumericFilter` included. Its value is a Unix timestamp in milliseconds. It keeps the type `date` so that a GUI can offer a date picker, whose change goes to `setDateTimeValue` of `useVtWebSocketDatabaseFilters`. A filter of any other type is rejected with a warning and is missing from the layout. ADR [general-vtwebsocket-date-filter-read-as-numeric.md](../../decisions/general-vtwebsocket-date-filter-read-as-numeric.md).

*Source: VtWebSocketSpec repository, `documentation/VtWebSocketSpec.md` version 1.8.0 §4.3 and §4.5, and findings A1, C8 and C18 of `issues/_manual/spec-vs-engine-api-deviations.md`, state of 2026-09-28; the type `date`, its unit, the missing `ops` of text filters and that a sorter ID is no field ID confirmed by Leoni Weber, owner of the specification, on 2026-09-28.*

## Where the implementation stops short of the spec

**The commands `action` and `result` are not implemented.** Section 2 lists them among the six commands of the API — `action` going to the server, `result` coming back — and defines neither: both words appear exactly once in the whole document, in that list. Nothing here sends or reads them, and until they mean something they stay out.

A message carrying any other command is **ignored on purpose**, which is what section 2 asks of a client so that the API can grow. It leaves an `info`-level entry titled "Unknown message received" in the connection's logs. A message that is not an object at all is a different case: that one is broken rather than new, and it is logged as a warning.

**The setting `lang` is never sent.** Section 2.4.1 offers the key for every source and `sendSet` can carry it, but nothing ties it to the i18n slice, so a language change in the GUI leaves the server's answers in whatever language it was configured for. Nothing needs that today: what the server would translate are the labels of a layout, and those are the keys the framework deliberately does not read.

## Where the spec stops short of the implementation

The specification covers `API`, `AUTH` and the `DBSourceHandler`. Five further handlers are implemented without being described anywhere — RESTClientSourceHandler, ImageSourceHandler, ViIOSourceHandler, SNMPSourceHandler and Log4CxxHandler — and so are the `set` option `long_polling` and the cache value `full`. **For those, the `send*` reducers of `vtWebSocketConnections.slice.ts` are the contract.** Their message shapes are not repeated here: a second description would be a second source to keep true. Why the gap stands instead of being tracked: ADR [general-vtwebsocket-code-as-handler-contract.md](../../decisions/general-vtwebsocket-code-as-handler-contract.md).

One consequence shows in the reports slice, which infers a source's handler from the shape of its messages. It recognizes `API`, `AUTH`, `DB`, `Rest`, `Image` and `Log4Cxx`; ViIO and SNMP sources keep the placeholder `?`, their `update` message being indistinguishable from a plain one.
