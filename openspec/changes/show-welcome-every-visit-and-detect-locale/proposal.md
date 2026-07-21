## Why

The welcome screen currently disappears for returning visitors, so the app's three-workspace model and onboarding guidance are easy to miss after the first session. The language choice also starts in English for everyone, even when the browser clearly prefers Japanese.

## What Changes

- Show the Harmony Hash welcome screen whenever the app is visited, while preserving the existing explicit close actions and Help/About reopen path.
- Keep the automated returning-visitor fixture isolated to the test build so the broad browser suite remains focused on its target flows.
- Select the initial EN/JP locale from the browser's ordered language preferences, with English as the fallback.
- Preserve the user's existing copy edits in `src/App.tsx`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `splash-onboarding`: Welcome onboarding opens on every normal app visit instead of only when dismissal storage is absent.
- `app-shell`: Initial locale follows the browser's supported language preferences.

## Impact

- Affected UI/state: `src/App.tsx` onboarding initialization and `src/i18n/I18nProvider.tsx` locale initialization.
- Affected shared logic: a small browser-locale detector with focused unit coverage.
- Affected validation: onboarding selectors and locale/browser regression coverage.
- No public API, dependency, persistence schema, or deployment secret changes.
