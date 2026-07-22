## ADDED Requirements

### Requirement: Aligned HASHER entry controls
The direct composer and Progression Agent SHALL use matching input/action geometry when they render side by side, while preserving their current stacked mobile behavior.

#### Scenario: Desktop input-row parity
- **WHEN** the viewport is at least 640px wide
- **THEN** the Build Your Own composer input surface and Run button SHALL align in height and action-column width with the Describe a Progression prompt and Run button

#### Scenario: Composer companion rail
- **WHEN** the direct composer renders with Browse Chords and the instrument selector
- **THEN** Browse Chords and the selector SHALL remain visually aligned on the shared rail and the selector SHALL preserve a rounded outer boundary around its active item

#### Scenario: Responsive containment
- **WHEN** the viewport is narrower than 640px
- **THEN** the direct composer and Progression Agent controls SHALL remain stacked, usable, and free of horizontal document overflow
