## ADDED Requirements

### Requirement: Branded link preview metadata
The application document SHALL expose a first-party Open Graph and Twitter/X large-image preview that uses the current Harmony Hash identity, describes the product consistently, and declares a 1200 by 630 pixel preview image.

#### Scenario: Link unfurl metadata
- **WHEN** a crawler parses the production application document
- **THEN** the Open Graph and Twitter/X title, description, image, and image alternative text SHALL describe the current Harmony Hash experience
- **AND** the preview image URL SHALL resolve on the Harmony Hash production origin to a 1200 by 630 pixel image
