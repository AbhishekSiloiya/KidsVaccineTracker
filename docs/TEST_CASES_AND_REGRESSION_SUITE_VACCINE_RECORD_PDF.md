# Test Cases and Regression Suite: Vaccine Record PDF

## Functional Test Cases

1. Download CTA visibility on Child Profile
- Preconditions: logged-in parent viewing owned child profile
- Steps: open child profile
- Expected: `Download Vaccine Record (PDF)` action is visible and clickable

2. Auth protection
- Steps: open `/child/<id>/vaccine-record.pdf` without login
- Expected: redirect to login

3. Ownership protection
- Preconditions: parent A logged in, parent B child exists
- Steps: parent A calls parent B child's PDF route
- Expected: `404`

4. File download behavior
- Steps: click download button on Child Profile
- Expected: file downloads; response type `application/pdf`; attachment header set

5. Filename pattern
- Expected: `<INITIALS>_vaxguard_vaccine_record_<YYYY-MM-DD>.pdf`

6. Header content
- Expected PDF contains:
  - `Vaccination Record`
  - generated date
  - `Child: <full child name>`
  - `Parent: <full parent name>`

7. Grouped schedule sections
- Preconditions: child with schedule entries (e.g. `8 Weeks`, `12 Weeks`)
- Expected: table rows are grouped under age headings matching schedule milestones

8. Status logic and date display
- Completed row: status `Completed`, date = completion date
- Due row: status `Due`, date = due date
- Overdue row: status `Overdue`, date = due date
- Missing due date row: status `Due`, date = `—`

9. Color coding rules
- Expected:
  - only `Status` and `Date` cells are color coded
  - vaccine names remain neutral text color

10. Summary stats strip
- Expected top stats show:
  - `Overdue`
  - `Due Soon`
  - `Complete/Total`

11. Empty schedule handling
- Preconditions: no schedule rows available
- Expected: PDF shows `No vaccination schedule available.`

12. Single-page compact format
- Expected footer indicates `Page 1 of 1` for current MVP output

## Regression Suite Coverage

Automated tests in `tests/test_vaccine_record_pdf.py` validate:
- auth/ownership constraints
- filename and core PDF text
- row status/date logic
- initials extraction
- stats logic
- schedule grouping
- empty schedule fallback

Project-wide regression command:

```bash
.venv/bin/python -m pytest -q
```

## Manual Regression Checklist

1. Desktop Child Profile panel still renders compactly and aligns with schedule cards.
2. Mobile Child Profile remains unchanged.
3. Download Calendar action still works.
4. Edit Child action still opens form and saves data.
5. Vaccine completion actions still update status chips and cards.

