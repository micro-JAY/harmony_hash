## 1. Session and request handling

- [x] 1.1 Add microphone-free receive-only Type connections and verify transport tests cover typed setup, audio readiness, cleanup, deadline, and unchanged Voice setup.
- [x] 1.2 Add bounded typed requests, response availability, and acknowledged transcript integration; verify coordinator tests cover tool continuations, duplicate events, and send failures.

## 2. Conversation panel

- [x] 2.1 Add input choice, composer, and English/Japanese feedback using existing tokens; verify browser tests cover mutually exclusive inputs, locked mode, draft persistence, and spoken-output health.
- [x] 2.2 Verify typed requests edit the live timeline through the existing tools and that the panel fits mobile and desktop layouts.
- [x] 2.3 Align agent guidance with Type requests and ukulele support, and verify source-owned prompt and tool tests.

## 3. Regression validation

- [x] 3.1 Run production build, lint, full unit tests, focused voice browser tests, and strict change validation; record results and any live-provider limitation in validation.md.
- [x] 3.2 Review the diff for server/tool/tour scope preservation and commit the validated feature branch.

## 4. Review follow-ups

- [x] 4.1 Gate Type sending until response generation, tool continuations, and spoken playback finish; verify started/stopped/cleared events, stale response IDs, and tool-only responses in coordinator and browser tests.
- [x] 4.2 Retain drafts until a matching provider acknowledgement; verify successful local sends followed by provider rejection or channel closure before acknowledgement preserve the draft for retry.
- [x] 4.3 Run focused voice tests, build/lint, strict change validation, and commit the reviewed fixes.

## 5. Review images

- [x] 5.1 Add and visually inspect committed desktop/mobile Type panel snapshots, then verify their screenshot assertions.
- [x] 5.2 Commit and push the feature branch for draft review without merging or deploying.
