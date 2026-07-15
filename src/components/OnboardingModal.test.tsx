import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OnboardingModal from "./OnboardingModal";

describe("OnboardingModal", () => {
  it("renders a named modal with an explicit dismissal action and scroll boundary", () => {
    const markup = renderToStaticMarkup(
      <OnboardingModal
        title="Find your harmony faster"
        description="Three connected workspaces for writing and learning."
        closeLabel="Close Harmony Hash introduction"
        primaryActionLabel="Start hashing"
        onRequestClose={() => undefined}
      >
        <p>Hasher, Tune Toolbox, and Fret Finder work together.</p>
      </OnboardingModal>,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toMatch(/aria-labelledby="[^"]+"/);
    expect(markup).toMatch(/aria-describedby="[^"]+"/);
    expect(markup).toContain('aria-label="Close Harmony Hash introduction"');
    expect(markup).toContain('data-onboarding-scroll-region="true"');
    expect(markup).toContain("max-height:calc(100dvh - (2 * var(--space-4)))");
    expect(markup).toContain("Start hashing");
  });

  it("uses only Tonari semantic tokens for modal surfaces and controls", () => {
    const markup = renderToStaticMarkup(
      <OnboardingModal
        title="Harmony Hash"
        closeLabel="Close"
        primaryActionLabel="Continue"
        onRequestClose={() => undefined}
      >
        <p>Welcome.</p>
      </OnboardingModal>,
    );

    expect(markup).toContain("var(--surface-raised)");
    expect(markup).toContain("var(--border-subtle)");
    expect(markup).toContain("var(--interactive-primary-bg)");
    expect(markup).toContain('data-reduced-motion="false"');
    expect(markup).not.toContain("aria-describedby");
  });
});
