## ADDED Requirements

### Requirement: Tonari Labs design system integration
The application SHALL import and use the Tonari Labs design system CSS tokens from the CDN.

#### Scenario: Design tokens loaded
- **WHEN** the application loads
- **THEN** the Tonari Labs design system stylesheet SHALL be loaded from `https://cdn.jsdelivr.net/gh/micro-JAY/tonari-design-system@main/tokens.css`

#### Scenario: Dark navy background
- **WHEN** any page is rendered
- **THEN** the page background SHALL use the design system's dark navy color

#### Scenario: Glow accent for interactive elements
- **WHEN** interactive elements (buttons, toggles, active states) are rendered
- **THEN** they SHALL use `--glow-accent` from the design token system

#### Scenario: Typography
- **WHEN** text is rendered
- **THEN** it SHALL use the Zalando Sans font family from the design system

### Requirement: Responsive single-page layout
The application SHALL be a single-page app with a responsive layout that works on desktop and tablet viewports.

#### Scenario: Desktop layout
- **WHEN** the viewport is 1024px or wider
- **THEN** chord cards SHALL be displayed in a horizontal scrolling row or multi-column grid

#### Scenario: Tablet layout
- **WHEN** the viewport is between 768px and 1023px
- **THEN** chord cards SHALL reflow to a 2-column grid

#### Scenario: Mobile layout
- **WHEN** the viewport is less than 768px
- **THEN** chord cards SHALL stack vertically in a single column

### Requirement: Application header
The application SHALL display a branded header with the app name "Harmony Hash" and the Tonari Labs identity.

#### Scenario: Header content
- **WHEN** the page loads
- **THEN** the header SHALL display "Harmony Hash" as the title with the instrument toggle control

### Requirement: Page structure
The application SHALL follow a top-to-bottom layout: Header → Input Area → Chord Cards Output.

#### Scenario: Input area placement
- **WHEN** the page loads
- **THEN** the progression input controls (text input, preset picker, key dropdown) SHALL appear below the header and above the chord card output area

#### Scenario: Output area
- **WHEN** a progression is submitted
- **THEN** chord cards SHALL render in a dedicated output area below the input controls
