## MODIFIED Requirements

### Requirement: Browser-locale default
The application SHALL initialize its EN/JP locale from the browser's ordered supported language preferences.

#### Scenario: Japanese preference
- **WHEN** the first supported browser language begins with `ja`
- **THEN** the application SHALL initialize in Japanese and set the document language to `ja`

#### Scenario: English or unsupported preference
- **WHEN** the first supported browser language begins with `en`, or no supported language is available
- **THEN** the application SHALL initialize in English and set the document language to `en`
