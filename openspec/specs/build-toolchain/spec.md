# build-toolchain Specification

## Purpose

Define how the npm lockfile and release checks verify the build, test and Worker development dependencies used to ship Harmony Hash.

## Requirements

### Requirement: Patched build toolchain

The repository SHALL resolve the reviewed dependency security updates in the root npm lockfile used by CI and the Worker build.

#### Scenario: Building a release candidate

- **WHEN** a clean Node 24 runner installs the release candidate with `npm ci`
- **THEN** its build and test tools resolve versions outside the affected advisory ranges
- **AND** the application build, unit tests, browser suite and Worker packaging succeed with that dependency tree.
