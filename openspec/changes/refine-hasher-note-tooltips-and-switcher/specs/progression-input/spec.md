## ADDED Requirements

### Requirement: Composer instrument selector placement
The HASHER composer SHALL place the global instrument selector in the composer action column directly beneath and aligned with the Run button, before the chord browser and output cards.

#### Scenario: Desktop composer actions
- **WHEN** the Build your own composer renders at desktop width
- **THEN** Run SHALL appear beside the progression composer and the instrument selector SHALL appear directly beneath Run in the same right-aligned action column

#### Scenario: Narrow composer actions
- **WHEN** the composer renders at 375 pixels wide
- **THEN** Run and the selector SHALL remain contained, reachable, and ordered before the chord browser without horizontal document overflow
