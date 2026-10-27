---
decided: 2026-09-30
jira: PDWG-82
---

# v4 builds only on the CibsJenkins

## Context and Problem Statement

v4 pins Node.js 24 (ADR [general-nodejs-pinned-to-the-active-lts-line.md](general-nodejs-pinned-to-the-active-lts-line.md)), and Node.js 24 requires Windows 10 or Server 2016. The build machine runs Windows 8.1. The agents of the VtJenkins run Windows 7, where Node.js 24 crashed at start with `0xc0000139` (`STATUS_ENTRYPOINT_NOT_FOUND`). The agents of the CibsJenkins run Windows Server 2019 and 2022.

## Considered Options

- Build v4 only on the CibsJenkins
- Pin Node.js 22, the newest line whose own start check still accepts Windows 8.1
- Keep Node.js 24 and let it start on Windows 8.1 through `NODE_SKIP_PLATFORM_CHECK=1`
- A newer Windows for the build machine

## Decision Outcome

Chosen: **the CibsJenkins only**; the build machine keeps building `v3.x`. Node.js 22 would buy seven months and cost the npm protections:

- Its security fixes end on 2027-04-30. After that, no supported Node.js runs on Windows 8.1 at all.
- It supports Windows 8.1 only as "Experimental": test failures on that platform block no release.
- It brings npm 10.9.9, which knows neither `min-release-age` nor `strict-allow-scripts`. The framework fixes one Node.js version for every machine, so every developer machine would lose both.
- `react-router` already requires at least Node.js 22.22.0, Babel at least 22.18.0. The next update that drops the line would hold back that package's security fixes too.

`NODE_SKIP_PLATFORM_CHECK=1` only silences Node.js's own refusal: the start on Windows 7 crashed, and the platform stays unsupported. A newer Windows for the build machine is not the framework's to decide, and the CibsJenkins already offers supported hosts. Windows 8.1 itself has received no security updates since 2023-01-10.

*Sources: `nodejs/Release` `schedule.json`; Node.js v22.x and v24.x `BUILDING.md` and `src/node_main.cc`; `nodejs.org/dist/index.json`; npm/cli v10.9.9 and v11.19.0 `workspaces/config/lib/definitions/definitions.js`; Microsoft Lifecycle "Windows 8.1"; all checked 2026-09-30.*

## Consequences

- Good: v4 builds on a supported Windows with Node.js 24 and npm 11, so `min-release-age` and `strict-allow-scripts` hold on every machine that builds the framework.
- Good: the CibsJenkins retrieves Node.js, the Electron binaries and VtWebGuiIcons by Ivy from Artifactory, so a build needs no access to the build machine's shares.
- Good: a release needs no build machine. The CibsJenkins build of `master` publishes the package to Artifactory and tags the built commit, shown with 4.0.0-rc.0.
- Bad: every consumer project on v4 builds on the CibsJenkins as well, since the framework fixes Node.js 24 for it; each needs a job of its own there.
- **Open:** a consumer resolves the framework the CibsJenkins publishes. A consumer's ivy file asks for `vi.release#VtWebGuiFramework` with `v:os="windows"` and the revision `[4_0_0rc0]`; the CibsJenkins published `vi.ci`, `all/all/all`, the revision `4_0_0rc0_0012` with status `integration`, into `ivy_ci` — settled by how a CibsJenkins build becomes a release (the CIBS team), or by the first consumer build there.
