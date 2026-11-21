## Why

Dependabot flagged the JavaScript build, test and Worker development toolchain. Its open pull request covers source-map-js alone. The repository needs one verified lockfile for local builds, GitHub Actions and Workers Builds.

## What Changes

- Update the affected packages through their existing dependency owners.
- Check the reported PHP incidents against the application entry point, manifests, workflows and static assets.
- Diagnose the existing Discovery screenshot failure so the complete browser suite can verify the release.

## Capabilities

- Added capability: `build-toolchain`, covering installation of the patched dependency tree.

## Impact

The root npm manifest and lockfile, the existing Discovery browser check if required, and release verification. The deployed entry point is `worker/index.ts`.
