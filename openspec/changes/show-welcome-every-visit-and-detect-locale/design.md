## Context

Harmony Hash already has versioned local/session dismissal persistence and an explicit Help/About entry point. The new requirement changes only the initial visibility policy; close actions can continue recording dismissal for compatibility and the existing Playwright returning-visitor fixture can remain isolated to its test build.

## Decisions

### Welcome visibility

`App` initializes onboarding open for normal builds. When `VITE_HH_E2E=true`, the existing persistence check remains active so the large suite can continue to enter each target surface without an onboarding overlay. Explicit close, Escape, and guided-tour actions keep their current session behavior.

### Locale detection

`src/i18n/locale.ts` provides a pure ordered-preference helper plus an SSR-safe browser detector. It walks `navigator.languages` followed by `navigator.language`, selects the first supported `ja` or `en` prefix, and falls back to English for unsupported or unavailable values. The provider uses the detector as a lazy state initializer so the current locale is chosen before the first render.

### Compatibility and safety

The existing persistence module remains intact because it still protects the explicit-close/session fallback contract and is used by the test harness. No user-authored copy in `src/App.tsx` is rewritten.

## Verification

- Vitest covers ordered Japanese/English preference selection and unsupported fallback.
- Existing onboarding tests continue to cover explicit dismissal, Help reopen, blocked storage, focus, reduced motion, and mobile containment.
- The rendered app is checked in the Browser at desktop and mobile sizes, including a fresh reload after dismissal and Japanese locale initialization where available.
