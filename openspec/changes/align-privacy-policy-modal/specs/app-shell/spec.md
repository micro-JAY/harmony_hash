## ADDED Requirements

### Requirement: Product privacy dialog follows the shared public contract

Harmony Hash SHALL present its complete policy in the established compact, single-column, internally scrolling accessible dialog. The English dialog heading SHALL be `PRIVACY POLICY`, the close control and content SHALL fit supported desktop and mobile viewports, and the footer trigger SHALL retain its natural localized action label.

#### Scenario: English policy uses the shared heading
- **WHEN** an English visitor opens the footer privacy action
- **THEN** the dialog heading is `PRIVACY POLICY` while the footer action remains `Privacy Policy`

#### Scenario: Existing dialog accessibility is preserved
- **WHEN** the dialog is operated with keyboard or at a narrow viewport
- **THEN** focus is trapped and restored, Escape and the close control dismiss it, background scrolling is locked, and the one-column content remains internally scrollable without horizontal overflow

### Requirement: Public policy identifies the verified operator and privacy contact

The English and Japanese policies SHALL identify Tonari Labs and Jana Jennings as the Japan-based operator, provide `privacy@tonari.ai` for privacy requests and applicable identity/address disclosure, and SHALL NOT direct privacy requests to `hello@tonari.ai`.

#### Scenario: Operator and contact are consistent
- **WHEN** localized policy content is inspected
- **THEN** both locales contain equivalent operator responsibility, on-request disclosure, and `privacy@tonari.ai` contact details

### Requirement: Public policy omits implementation identifiers and unverified analytics claims

The policy SHALL describe only provider behavior supported by the repository and SHALL NOT publish a raw analytics property identifier or claim a Cloudflare analytics product that cannot be verified from source.

#### Scenario: Policy content stays provider-bounded
- **WHEN** policy text is searched for analytics details
- **THEN** it contains no `G-...` property identifier and limits Cloudflare processing to evidenced hosting, security, rate limiting, request logging, and technical observability
