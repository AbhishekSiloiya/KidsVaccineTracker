# Changelog

All notable changes to the VaccinationTracker project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- Better Profile management
- Try out a new Hamburger style navigation
- Add Vaccination for UK
- Allow users to add one child without login
- Add comparison between Indian and UK vaccination schedule
- Change the Overdue/Due Soon/Completed to be filters

### Added
- Child Profile CTA to download a Vaccination Record PDF.
- New PDF route: `/child/<id>/vaccine-record.pdf` with authenticated child ownership checks.
- File naming with child initials prefix: `<INITIALS>_vaxguard_vaccine_record_<YYYY-MM-DD>.pdf`.
- Child and parent identity lines in PDF header.
- Grouped vaccine sections in PDF by schedule milestones (for example: `8 Weeks`, `12 Weeks`).
- Top summary stats in PDF: `Overdue`, `Due Soon`, `Complete/Total`.
- Dedicated PDF test coverage in `tests/test_vaccine_record_pdf.py`.

- ✅ A Flask Webapp

### Changed
- Child Profile desktop top panel redesigned to a compact three-row layout:
  - identity row
  - status row
  - action row
- Desktop visual scale reduced to match reference mock while preserving mobile layout behavior.
- Vaccine Record PDF row rendering now color-codes `Status` and `Date` only.
- PDF date behavior aligned to website logic:
  - completed vaccines show completion date
  - due/overdue vaccines show due date
- Vaccine Record PDF now renders as a compact single-page output for current MVP scope.

### Fixed
- Removed Dose column from vaccine PDF after placeholder rendering ambiguity.
- Corrected desktop panel width alignment with schedule cards.
- Corrected PDF grouping route wiring to avoid generation fallback redirects.

## [2.0.0] - 13/08/2025
### Changed
- 🎯 **Major Mobile UI Improvements**:
  - Improvements to the responsive layout for both tablets and mobile devices
- The entire business logic is now server-side handled via the Flask and Flask-SQLAlchemy
- Parents are now able to create Profiles.
- Changed the workflow to be integrated with Flask

## Version History

### Version 1.0.0
- **Release Date**: December 19, 2024
- **Status**: Stable Release
- **Features**: Complete vaccination tracking system
- **Browser Support**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
### Version 2.0.0 (Current)
- **Release Date**: August 08, 2025
- **Status**: Stable Release
- **Features**: Server Side Flask Webapp
- **Browser Support**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+

---

## How to Use This Changelog

### For Developers
- Add new entries under [Unreleased] for ongoing work
- Move [Unreleased] to a new version when releasing
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Include breaking changes, new features, and bug fixes

### For Users
- Check the latest version for new features
- Review breaking changes before updating
- Report issues for future releases

## Contributing to Changelog

When adding new features or fixing bugs:

1. **Add to [Unreleased] section**:
   ```markdown
   ### Added
   - New feature description
   
   ### Fixed
   - Bug fix description
   
   ### Changed
- 🎯 **Major Mobile UI Improvements**:
  - Reduced header space and optimized typography for mobile
  - Full-width buttons with 44px minimum touch targets
  - Improved form layout with better spacing
  - Enhanced button stacking on mobile devices
  - Better input field sizing (48px height, 16px font)
  - Optimized card padding and margins for mobile
  - Improved read-only view layout on small screens
  - Added extra small screen support (up to 480px)
  - Better country info positioning on mobile
  - Enhanced error message styling
  - 🎯 **Sleek Layout Optimization**:
    - Ultra-compact mobile design with 50% space reduction
    - Optimized typography: 1.5rem header, 0.75rem subtitle
    - Compact card padding: 0.75rem (mobile), 0.5rem (small mobile)
    - Streamlined button layout with full-width design
    - Improved vaccine text wrapping and display
    - Better child info layout with stacked design
    - Enhanced status badges with compact sizing
    - Optimized form spacing and input sizing
    - Reduced margins and padding throughout
    - Better touch targets while maintaining compact design
   - Breaking change description
   ```

2. **Use clear, concise descriptions**
3. **Include issue numbers if applicable**
4. **Update version number when releasing**

## Testing Status

- **Lint Test**: ✅ Implemented
- **Integration Tests**: ✅ Implemented
- **Security**: ✅ Implemented
- **Coverage**: >80% target
- **CI/CD**: ✅ Automated testing pipeline 
