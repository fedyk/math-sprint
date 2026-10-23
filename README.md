# Math Sprint

Multiplication and division arcade with local profiles and offline play.

## Build and test

Requires Node.js and npm. Install build dependencies with `npm ci`, then run:

```sh
npm run build
npm test
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080. Service workers require HTTPS outside localhost.
Always serve the generated `dist` directory for offline testing, not the repository root.
The build compiles Tailwind and fingerprints all offline assets and the worker implementation.
Rebuild after changing HTML, JavaScript, styles, or assets.

## Deploy

The included `vercel.json` sets `npm run build` and the `dist` output directory.
Deploy through the existing Vercel project at https://math-sprint-sable.vercel.app/.
This repository change does not itself publish a deployment.

Open the deployed app online once and wait for **Ready for offline use**.
Then it can be opened and played offline, including from its home-screen icon.
On iOS/iPadOS use Safari's Share → Add to Home Screen; on Android use the browser's Install app/Add to Home screen menu.

Updates download when online and appear as an **Update app** button between rounds.
Applying an update reloads the app without clearing local profile data.
Rounds pause when the page is hidden and require **Resume** on return; paused time is excluded from answer timing.
A closed/reloaded app does not restore an unfinished round.
Profiles and caches are device/browser-local; clearing site data removes them. An initial visit requires a connection.

## Release checks on devices

- Android Chrome and iPhone/iPad Safari: launch from browser and home screen.
- Wait for offline readiness, enable airplane mode, close and reopen; play and verify saved progress after reload.
- Background/lock during an answer and during mistake feedback; confirm Resume preserves the remaining time.
- Deploy a new build while a round is running; confirm updates wait until between rounds.

Bundled fonts: Google Fonts (Fredoka One and Nunito, SIL Open Font License).
Font Awesome Free 6.4.0: font under SIL OFL 1.1 and CSS under MIT.
Canvas Confetti 1.6.0: ISC. See assets/vendor/ for license texts.
