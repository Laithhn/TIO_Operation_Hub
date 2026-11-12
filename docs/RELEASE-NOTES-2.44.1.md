# TIO Operations Hub 2.44.1

Prepared 2 November 2026.

The **Roles** page now opens with a role-by-permission comparison matrix inspired by the supplied administration screenshot. Its rows follow the existing Module → Submodule → Tab → Action hierarchy, with expandable branches, search, module filtering, fixed row/column headings and a horizontally scrollable role comparison. Selecting a row or role cell opens a detail panel with the permission key, description, parent path, prerequisites and each role's saved/effective state. **Configure** opens the existing Rights editor on that role and permission. Administrators with view-only access see **Inspect** instead. The existing role catalog, creation, cloning and deletion controls remain below the matrix.

The matrix reads the current role API and does not write grants. Role changes still use the Rights editor's staged review, conflict handling and server-side authorization. No new authorization policy or database migration was added in 2.44.1; the 2.44.0 four-level hierarchy and its migration remain included for installations upgrading from earlier versions.

See [RELEASE-VALIDATION-2.44.1.md](RELEASE-VALIDATION-2.44.1.md) for test results and package provenance, and [desktop](evidence/roles-matrix-2.44.1/desktop.png) and [phone](evidence/roles-matrix-2.44.1/phone.png) captures of the final screen. The package is built from the current uncommitted working tree; `BUILD-INFO.txt` records its base commit and build time.
