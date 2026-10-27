---
decided: 2026-10-23
jira: PDWG-81
concept_commit: 95fd93be
---

# The start check judges a browser by the engine it renders with

## Context and Problem Statement

The browser list names browsers, but several browsers render with another's engine. Every browser on iOS renders with the system's WebKit — about 3 % of US page views in August 2026 go through one other than Safari — but Chrome and Firefox there send no `Version/` token, so the Safari pattern missed them and the start check alerted them. Opera runs on Blink, but the Chrome pattern excluded it, and 1.6 % of US page views got the alert for an engine that runs the framework.

## Considered Options

- **An `Opera` entry of its own**, judged by its `Chrome/` token — a second entry for the engine the Chrome entry already judges.
- **Judging each browser by its engine**, through the patterns of the entries the list already has.
- **Leaving the browsers on iOS and Opera alerted** — a wrong message for an engine the framework supports.

## Decision Outcome

Chosen: **the engine judges.** What the framework needs, its CSS and its Web APIs, belongs to the engine, so a browser gets the verdict of its engine's entry. A browser's own version says nothing about that: `CriOS/` names a Chrome release, not the WebKit that renders it. The patterns of `src/checkEnv.js` assign every browser to the entry of its engine:

- **Safari** takes Chrome (`CriOS/`), Firefox (`FxiOS/`) and Edge (`EdgiOS/`) on iOS and iPadOS. Where such a browser sends no `Version/` token, the iOS version in the user agent judges it.
- **Chrome** takes Opera by its `Chrome/` token, as it takes Samsung Internet, Brave and Android's WebView.

One case escapes the patterns: Chrome on an iPad in desktop mode sends a desktop Chrome user agent and passes as Chrome, whatever WebKit renders it. The consumer document lists which browsers each entry covers.

## Consequences

- Good: no browser on a supported engine gets a wrong alert, and the list gains no entry, so a project's own copy of it needs none for these browsers either: the build copies the framework's start check, patterns included.
- Bad: the iOS version judges a floor up to 18 only. Since iOS 26 WebKit freezes the OS version in the user agent at 18 (`18_6`, later `18_7`), and a third-party browser may send the frozen value or the real one. A Safari floor above 18 (ADR `general-safari-floor-18.md`) needs another way to judge these browsers.
