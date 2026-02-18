# Release Notes: Vaccine Record PDF MVP

## Release Scope
This release introduces a production-ready MVP for downloading a child's vaccination record PDF from the Child Profile page, plus supporting UX refinements and validation coverage.

## Highlights
- Added `Download Vaccine Record (PDF)` on Child Profile.
- Added authenticated PDF endpoint for the selected child only.
- PDF naming format now includes child initials and date:
  - `<INITIALS>_vaxguard_vaccine_record_<YYYY-MM-DD>.pdf`
- PDF header includes:
  - Vaccination Record title
  - Generated date
  - Child full name
  - Parent full name
- PDF table now:
  - uses grouped sections by schedule milestones (for example `8 Weeks`, `12 Weeks`, etc.)
  - color-codes `Status` and `Date` values only
  - shows due date for due/overdue rows and completion date for completed rows
- Added top stats strip in PDF:
  - `Overdue`, `Due Soon`, `Complete/Total`
- PDF output tuned to compact single-page MVP format.

## Privacy and Content Decisions
- Earlier non-PI constraints were intentionally revised per stakeholder direction:
  - child full name and parent full name are now included in the PDF body.

## UX Updates (Web)
- Desktop Child Profile top panel refactored to a compact three-row layout.
- Mobile layout behavior retained as-is.

## Validation
- Full automated suite passing locally at release point:
  - `27 passed`

## Files Impacted
- `app/views.py`
- `app/template/child_view.html`
- `tests/test_vaccine_record_pdf.py`
- `CHANGELOG.md`

