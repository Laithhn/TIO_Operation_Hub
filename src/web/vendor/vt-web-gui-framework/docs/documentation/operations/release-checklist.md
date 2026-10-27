# Release checklist

The procedure for producing a new release of VtWebGuiFramework. The release branch carries the version number it produces in its semver spelling (`release/4.0.0-rc.0`) and forks off `develop`; branch types, the git-flow finish, and the release tags are in the `git` rule (`.claude/rules/_local/git.md`). v4 builds on the CibsJenkins only, never on the build machine (ADR `general-v4-builds-only-on-the-cibs-jenkins.md`).

1. Update the documentation, above all under `proj/contents/overview/start`, `proj/contents/overview/releases`, `proj/contents/secondSidebarContent`, and `proj/contents/forDevelopers/yourProject/step1`.
2. Check in all pending changes on the integration branch.
3. Start a new git-flow release, using the new version number as the release name.
4. Enter the new version number in `settings.js` under `settings.meta.version` and under `settings.packages.vtWebGuiFramework`.
5. Enter the VtWebGuiIcons version to be used in `settings.js` under `settings.packages.vtWebGuiIcons`.
6. Enter the Node.js version to be used in `settings.js` under `settings.packages.nodeJs`.
7. Check that the packages the build retrieves by Ivy are available in Artifactory under `vi.add`: `ExtToolsNode` for the Node.js version, and `ExtBinariesElectron` and `ExtBinariesElectronBuilder` for `electron` and `electron-builder`.
8. Run `applySettings.js`, then check the console output and the BeyondCompare comparisons.
9. Build the distributions and Electron releases locally and check them.
10. Check in all further changes on the release branch; the preparation commit follows the repo's commit format, e.g. `chore(release): prepare version 4.0.0-rc.1`. A release has a ticket only sometimes, and only then does its key lead the subject (`git` rule).
11. If the build itself has changed since the previous release, build the release branch of VtWebGuiFramework on the CibsJenkins with `doNotPublish` set, and check it. It has changed when `git diff <previous release tag> -- applySettings.js npmCommandsForMakefile.cmd VtWebGuiFramework_Bare.mak build/ settings.js package.json package-lock.json .npmrc` shows anything beyond the new VtWebGuiFramework version; a new Node.js or VtWebGuiIcons version counts. ADR `general-release-probe-build-only-on-build-changes.md`.
12. Close the release branch.
13. Build the `master` branch of VtWebGuiFramework on the CibsJenkins without `doNotPublish`, and check it.
14. Update the generated demo project on the Chow server.
