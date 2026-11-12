# Reporting history source review — 10 November 2026

This is a read-only review of the local source checkout, requested to interpret a live observation made by the primary browser auditor. This subtask made no target HTTP request, database connection, file-store inspection, export or download. Source behavior is not proof of the deployed binary or a particular stored row.

## Observation supplied by the primary auditor

Reporting Center history displayed six exports with `Details unavailable`, `Rows —`, `File —` and no Download action; five were marked Completed with a future retention date of 19 November. One export detail view showed audit reference `fe9858c3-c9fa-470d-9535-55e1011c46b8`, requested 5 November at 15:19. Exact live screen evidence and reproduction are maintained by the primary auditor.

## Confirmed source behavior

| Source location | Behavior and implication |
|---|---|
| `src/TioHub.Api/Modules/Reporting/BuilderEndpoints.cs:34–54` | `CanSeeJobDetails` requires the requesting user to own the job and its saved access fingerprint to match the current user. A non-completed scheduled job is also masked. When details are disallowed, `JobDto` deliberately returns the literal `Details unavailable`, null row/file metadata and `canDownload=false`, while preserving the recorded status and expiration time. This exactly explains the displayed combination without requiring a missing export file. |
| `src/TioHub.Api/Modules/Reporting/ExportAccessFingerprint.cs:10–29` | Fingerprint includes user identity/active state, all client/internal scope flags, client/project/environment/team IDs, all effective rights and any scoped exceptions. Equality is exact; even a right addition or a renamed dashboard right can change it. A null legacy fingerprint fails closed. |
| `src/TioHub.Api/Data/Migrations/20261102140000_ExportAccessFingerprint.cs:14–16` | Migration adds a nullable fingerprint column. It does not reconstruct authorization for old files. |
| `docs/ACCESS-CONTROL-IMPLEMENTATION.md:23,41` | Documentation explicitly says export history hides sensitive metadata after a fingerprint mismatch and older files without a fingerprint must be regenerated. This is an intentional access-control policy. |
| `src/TioHub.Api/Modules/Reporting/ReportingEndpoints.cs:126–138` | Details GET uses the same masking function. Hidden columns/filters return null. Viewing the detail dialog does not reveal a reason code for the masking. |
| `src/TioHub.Api/Modules/Reporting/ReportingEndpoints.cs:252–282` | The actual download endpoint independently checks ownership, report export permission and fingerprint. A mismatch produces “Your access may have changed since this file was generated. Generate the report again.” It checks expiry/file availability afterwards and updates an expired/missing-file job when downloaded. No download was invoked during this review. |
| `src/web/src/pages/Reports.tsx:395–416,448–480` | The table and detail dialog display the masked values, keep the Completed/expiry labels and hide Download when `canDownload` is false. Neither view explains that the user's effective access changed or that regeneration is required. A null columns value is displayed as `All, standard order`, which can misleadingly look like known column selection even when metadata is hidden. |
| `tests/TioHub.Tests/ExportHistoryScopeTests.cs:38–64`, `tests/TioHub.Tests/DataScopeTests.cs:126–145` | Existing source tests specify masking after access changes and rejection of legacy fingerprints. Tests were inspected, not run, by this subtask. |

No legacy `ExportLog` → `ExportJob` backfill was needed to explain this observation. The direct and sufficient source explanation is intentional history masking. Creation in `ExportService.cs:226–270` captures access before reading report rows and marks a normal generated file Completed only after `SaveAsync` succeeds; however, that source sequence does not establish the current physical file status of the observed exports.

## Plausible cause of these specific older entries — unverified

The recorded jobs predate 10 November. The local migrations dated 10 November add audience-dashboard rights (`20261110082431_AudienceDashboards.cs:66–75`) and rename the Project dashboard right to Client dashboard (`20261110114537_ClientDashboard.cs:58–71`). Since the fingerprint includes all effective rights, an account affected by either migration would have a new fingerprint and older files would be hidden. A manual role/scope change or a legacy null fingerprint can produce the same UI. We did not inspect saved/current hashes, deployment history or account changes, so do not assert any one of these as the observed root cause.

## Finding classification

**Do not classify this evidence as a confirmed file-generation, retention or storage failure.** Completed is the historical generation outcome; future expiry is a retention date and does not promise that current access still permits the file. Access masking is deliberate and should remain in place.

There is an evidenced **UX explanation gap** if the primary live screenshots confirm the supplied observation: a user sees Completed and a future expiry but no explanation or recovery action for the absent download. Suggested P2 when it blocks routine management reporting and repeated support investigation; otherwise P3. The primary auditor should calibrate severity against actual affected workflow scope. This source review alone does not create a new defect ID or prove broader impact.

Recommended correction: return a safe metadata-availability reason (`access-changed`, `other-owner`, `legacy-export`, `schedule-not-completed`) and render clear text such as “Generated successfully; unavailable under your current access. Generate a new report.” Keep original generation status and expiry, but label them as historical/retention values. Offer navigation to an authorized report configuration; require an explicit user action before generation. Do not show hidden filters, rows, file names or a fictitious standard column list. Keep download and retry endpoints fail-closed.

Acceptance: an unchanged owner sees a retained completed file and its download; after access changes, old metadata remains masked, the reason and recovery guidance are visible and no download is offered; another user's metadata stays masked; null-fingerprint legacy files show regeneration guidance; hidden column metadata says Unavailable rather than All; accessible newly generated files remain usable. Add UI regression coverage alongside the existing masking unit tests, using approved isolated data.
