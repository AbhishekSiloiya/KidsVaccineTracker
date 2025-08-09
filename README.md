# VaccinationTracker

A responsive web application for tracking children's vaccination schedules based on the IAP 2024 schedule for India.

## Features

- **Child Profile Management**: Add and manage multiple children
- **Vaccination Schedule**: Complete IAP 2024 vaccination schedule
- **Status Tracking**: Track due, upcoming, and completed vaccinations
- **Calendar Export**: Download vaccination schedule as ICS file
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Offline Support**: Progressive Web App (PWA) functionality
- **Data Persistence**: Local storage for data backup
- **Form Validation**: Comprehensive input validation

## Getting Started

1. **Clone or download** the project files
2. **Open `index.html`** in a modern web browser
3. **Start tracking** your child's vaccinations!

## Usage

1. **Enter Child Information**: Provide the child's name and date of birth
2. **Generate Schedule**: Click "Generate Schedule" to create the vaccination timeline
3. **Track Progress**: Mark vaccinations as completed with dates
4. **Export Calendar**: Download the schedule to your calendar app
5. **Edit Information**: Modify child details anytime

## Technical Details

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: Tailwind CSS for responsive design
- **Storage**: Local Storage API for data persistence
- **PWA**: Service Worker for offline functionality
- **Validation**: Custom validation library
- **Export**: ICS format for calendar integration

## Development

- Node.js 18+ recommended.
- Install dependencies:

```bash
npm install
```

### Linting

```bash
npm run lint       # check
npm run lint:fix   # auto-fix
```

Notes:
- The codebase avoids blocking browser APIs in production logic. We replaced direct `alert`/`confirm` with UI flows or error display. Any remaining usages are wrapped and explicitly allowed with inline eslint disables as needed.
- `console` usage is minimized. Where necessary, logs are routed via controlled calls and annotated to satisfy lint rules.

### Testing

Jest with jsdom is configured. Useful commands:

```bash
npm test           # run all tests
npm run test:watch # watch mode
npm run test:ci    # CI-friendly run with coverage
```

The test environment (`tests/setup.js`) provides:
- Mocks for `localStorage`, `sessionStorage`, `alert`, `URL.createObjectURL`, and service worker registration
- DOM helpers and global utilities

### Validate Before Commit

```bash
npm run validate   # runs lint then tests
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Data Privacy

All data is stored locally in your browser. No information is sent to external servers.

## Contributing

- Create a feature branch
- Ensure `npm run validate` passes
- Open a PR describing changes

## License

This project is open source and available under the MIT License.