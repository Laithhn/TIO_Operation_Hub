---
decided: 2026-10-22
jira: PDWG-138
---

# Load the WebSocket slices with the first module that uses them

## Context and Problem Statement

The four WebSocket slices hang themselves into the store through `rootReducer.inject` when their module is first imported, and only the slice `webSockets` creates and opens the connections of `config.xml`. The protocol slice `vtWebSocketConnections` followed the status of a connection on the socket itself and did not import `webSockets`. A project that imported only the protocol slice at startup, as VtWebGuiPsEnforcement does, therefore never opened its `autoOpen` connection. A protocol slice loaded after a connection had opened never sent its `API` and `AUTH` queries, and neither case reported an error.

## Considered Options

- Make `webSockets`, `vtWebSocketConnections` and `vtWebSocketReports` fixed slices of `rootReducer`, as `webSockets` was under v3
- Let `src/index.tsx` import the slices dynamically when `config.xml` defines `<WebSocket>` nodes, before the store's first action
- Let the protocol slice import `webSockets` and take the status from there, catching up with connections already open when it loads

## Decision Outcome

Chosen: **the protocol slice imports `webSockets`**. It takes the status of a connection from the action `receiveStatus`, and `server` and `useAuth` from the connection's settings in that slice. With the first action after its import, it takes over the status of every VtWebSocket connection that has already left `closed`. Any import of the VtWebSocket interface thus opens the connections of the configuration.

Fixed slices were rejected because a project may use no WebSocket at all and would still load the code of all three and open a storage for session keys. The dynamic import from `src/index.tsx` was rejected because it puts the reading of the `<WebSockets>` node outside the slices that own it.

## Consequences

- Good: a project without WebSockets loads none of the slices.
- Good: the dependency of the protocol on the connection layer is an import the code uses, so nobody removes it as unused.
- Bad: `autoOpen="true"` opens a connection when the first module using WebSockets is loaded, not when the application starts. A project that needs an open connection before it uses one has to import a WebSocket module earlier.
