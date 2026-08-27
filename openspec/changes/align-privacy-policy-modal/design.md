## Context

Harmony Hash already provides the compact, accessible single-column privacy dialog that the other Tonari products will adopt. Its policy content nevertheless needs the shared public contract: an uppercase English dialog title, verified operator and privacy contact details, bounded provider claims, and automated protection against leaking raw analytics property identifiers.

## Goals / Non-Goals

**Goals:**

- Preserve Harmony's existing accessible dialog layout and interaction model as the cross-product visual reference.
- Keep the individual operator disclosure and `privacy@tonari.ai` contact consistent and testable.
- Use an uppercase English policy heading and a current update date.
- Narrow Cloudflare wording to behavior supported by the repository and reject raw analytics property identifiers in public copy.

**Non-Goals:**

- Redesigning the dialog, changing runtime providers, or altering Harmony's application data flows.
- Removing the operator identity without qualified legal review.
- Adding analytics or consent tooling.

## Decisions

### Treat the current dialog as the shared layout contract

The existing `AccessibleDialog` shell, 48rem content measure, fixed header, square close control, single-column scroll region, focus trap, scroll lock, and mobile behavior remain unchanged. This minimizes regression risk while Tonari and Tutor converge on the same structure.

### Change dialog content without changing the footer action label

The English dialog heading becomes `PRIVACY POLICY`; the footer trigger remains the localized product action label. Japanese retains its natural localized heading. The policy's last-updated date advances to August 10, 2026.

### Preserve verifiable controller details and bound infrastructure claims

The notice continues to identify Tonari Labs and Jana Jennings as the operator, uses `privacy@tonari.ai`, and explains that the private address is supplied without delay for applicable requests. Cloudflare wording is limited to hosting, security, rate limiting, request logs, and technical observability evidenced by the repository; it does not assert dashboard-only Web Analytics. Tests reject `hello@tonari.ai` and raw `G-...` identifiers inside policy content.

## Risks / Trade-offs

- **Policy wording may drift as providers change** → Keep content alongside tests for required identity/contact and disallowed identifiers, and re-audit provider flows when they change.
- **Uppercase text could accidentally affect all policy triggers** → Change only the English dialog title data, leaving localized footer actions intact.

## Migration Plan

Update content and assertions in one atomic milestone, run focused unit/browser coverage, then run the full project and strict OpenSpec validation. Rollback is a normal commit revert; no persisted data changes.

## Open Questions

None.
