# TIO Operations Hub 2.41.0

Production package release, 29 October 2026. Attachments redesign (decision A74 in `docs/DECISIONS.md`).

## Changed

- **Attachments are a file workspace on every record page that takes them:** clients, regions, projects, contracts, environments,
  servers, application installations, components, cases, commitments, escalations, products and teams (14 places). The old inline
  panel is gone. What the workspace offers:
  - **Header and summary:** the file count, an *Upload files* button, and cards for total files, document categories, uploaders and
    the latest upload. All values come from the record's actual files.
  - **Finding files:** search by file name (not case-sensitive), *Category* and *File type* filters, six sort orders and *Reset*.
    Pages of 8, 15, 25 or 50 rows. "No files yet" and "no matches" have separate empty states.
  - **File list:** a file-type icon, the full file name (long names are shortened with "…"), category, type, size, upload date and
    uploader. Each file has a ⋮ menu with *Preview*, *Download* and *Delete*. Several files can be selected and deleted together.
  - **Preview:** clicking a file name opens it beside the list (as a drawer on narrow screens), with *Preview*, *Details* and
    *Version history* tabs. PDFs and images show inline, text files show as plain text, and other types offer a download.
  - **Upload dialog:** drag and drop or browse, several files at once, a progress bar, and the server's type and size limits checked
    before anything is sent.
  - **Deletion** always asks for confirmation.
- **Rights are unchanged:** uploading needs Edit records (and client scope for clients); the uploader, or a holder of Delete records,
  deletes a file.

## Limitations

- The server stores **no category and no versions** for files. The category is the file's kind, read from its extension, and is
  labelled "by file type". *Version history* says that versions are not kept.
- There is **no bulk download** (no endpoint for it). Selected files can only be deleted together.
- Word, Excel, PowerPoint and other Office files have no inline preview (no converter); they offer a download.

## API

- **New `GET /api/v1/attachments/{id}/preview`** (additive, read-only). It serves PDFs and images only, with the same access checks as the
  download, and the content type is fixed by the file extension. For this response only:
  - The file is shown in the browser (`Content-Disposition: inline`) instead of downloaded.
  - `X-Frame-Options` is `SAMEORIGIN` instead of `DENY`, so only the hub's own pages may embed it.
  - A restrictive `Content-Security-Policy` (`default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'`) means
    the shown document loads nothing else.

  Every other response keeps the existing security headers. `GET /attachments/{id}/download` is unchanged.

## Database and deployment

- **No database change** (no new migration). `database/01-schema.sql` is unchanged; running it again is harmless.
- **No new settings.**
- Replace the application files as usual and follow the standard backup and rollback procedure in `docs/OPERATIONS.md`. Users may need a
  hard refresh (Ctrl+F5) the first time.

The deployment notes and known limitations of 2.40.0 still apply (see `RELEASE-NOTES-2.40.0.md`).

## Validation

- Before packaging (source, isolated `(localdb)\TioHubQALocalDB`): typecheck and production build clean; Vitest **47/47** (5 new);
  .NET **269/269** (1 new: preview headers and refused types); Playwright: see `docs/TEST-RESULTS.md`.
- Checked in a browser against the API with the production security headers: inline preview for PDF, image and text files, upload, filters,
  sorting, pages, single and bulk delete, the drawer at 1000 px and phone width (375 px).
- The release script reruns the .NET suite, and `BUILD-INFO.txt` records the source commit. Results of the package build are in
  `docs/TEST-RESULTS.md`.
- Not covered: IIS installation and `Upgrade-TioHub.ps1` on a real server, Windows (Negotiate) and forms sign-in against the package, PDF
  preview in browsers other than Edge and Chromium, a touch-device test, a screen-reader session, and the actual UAT environment and its database.
