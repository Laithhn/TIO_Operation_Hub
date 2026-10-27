---
decided: 2026-10-23
jira: PDWG-81
concept_commit: 95fd93be
---

# Support Safari from version 18

## Context and Problem Statement

Safari was not a supported browser: the start check alerted every Safari user, and the application then ran in an engine nobody had tested. One consumer runs an internet service for the US market, where Safari carried 29 % of page views and 53 % of mobile ones in August 2026 (StatCounter). The open question was the floor: 26, the current line, or 18, the last Safari of macOS Ventura and the last iOS of the devices iOS 26 dropped.

## Considered Options

- **Safari 26** — reaches every Mac still taking updates and every iOS-26 device, and frees anchor positioning, scroll-driven animations, `field-sizing`, `scrollbar-color` and the Navigation API for the ports ahead. It shuts out about 7 % of US page views.
- **Safari 18** — adds the Ventura Macs and the iOS-18 devices, shutting out about 3 %. It costs no code today: the one feature in use that arrived after 18.0 needed its fix for 26.0 as well.
- **18 now, 26 later** — two floor changes and two release notes, with the 26 features waiting just the same.

A floor below 18 was no option: the dark areas rest on container style queries, which Safari reads from 18.0 (ADR `general-ground-travels-as-an-inherited-custom-property.md`).

## Decision Outcome

Chosen: **Safari 18**, the lowest floor the code allows, for the wider audience at no code cost today.

- **The list in `settings.js` names `['Safari', 18]`.** Babel's output does not change: every syntax Safari 18 lacks, the current targets lack as well, so Babel transpiles it already.
- **Nothing Safari added after 18.0 may carry a function of the framework** for as long as this floor holds. Raising the floor above 18 also needs a new way to judge the other browsers on iOS (ADR `general-start-check-judges-browsers-by-engine.md`). The CSS Safari reads differently is listed in `documentation/code-style/scss.md`.
- **The floor was merged untested.** No WebKit engine and no Apple device was at hand, and the work reached `develop` on 2026-10-23, its entry in the 4.0.0 release note included, before any test path existed. The test follows once one exists and does not gate the floor; a finding reopens `PDWG-81`.

## Consequences

- Good: the Ventura Macs and the iOS-18 devices are in — about 4 % of US page views in August 2026 that a floor of 26 would have shut out, 3.3 % on iPhones and 0.7 % on Macs.
- Bad: the Safari 26 features stay off limits for the ports ahead, anchor positioning above all, which the card, the menus and the tooltip would otherwise position themselves with.
- Bad: proving the floor takes a second pass on Safari 18.x hardware, a Ventura Mac or an iOS-18 device. Playwright's WebKit follows WebKit's trunk, so it carries every feature Safari added after 18 and cannot show what 18 lacks.
- Bad: Safari never extends the exception a user grants on its warning page to a `wss:` socket. Where a device does not trust the server's certificate at the level of its operating system, the socket fails like a network drop, and the framework's error cannot name the cause; the consumer document states what the hosting owes the socket.
- **Open:** that the framework renders and behaves in Safari 18 and 26 as in the other engines — settled by a walk through every content in Playwright's WebKit once `PDWG-131` brings it in, an acceptance on a current Mac or iPad, and a second pass on Safari 18.x hardware where one can be had.
