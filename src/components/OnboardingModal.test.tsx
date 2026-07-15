import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OnboardingModal from "./OnboardingModal";

describe("OnboardingModal", () => {
  it("renders a named modal with an explicit dismissal action and scroll boundary", () => {
    const markup = renderToStaticMarkup(
      <OnboardingModal
        brandLabel="HARMONY HASH — TONARI LABS"
        title="Find your harmony."
        description="Interactive chord explorer. Discover harmony across keys and modes."
        closeLabel="Close Harmony Hash introduction"
        primaryActionLabel="START HASHING"
        onRequestClose={() => undefined}
        visual={<img src="/hh_logo.png" alt="" />}
      >
        <p>HASHER, TUNE TOOLBOX, and FRET FINDER work together.</p>
      </OnboardingModal>,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toMatch(/aria-labelledby="[^"]+"/);
    expect(markup).toMatch(/aria-describedby="[^"]+"/);
    expect(markup).toContain('aria-label="Close Harmony Hash introduction"');
    expect(markup).toContain('data-onboarding-scroll-region="true"');
    expect(markup).toContain("max-height:calc(100dvh - (2 * var(--space-4)))");
    expect(markup).toContain("START HASHING");
    expect(markup).toContain('/hh_logo.png');
  });

  it("exposes the token-backed surface and control hooks", () => {
    const markup = renderToStaticMarkup(
      <OnboardingModal
        brandLabel=""
        title="Harmony Hash"
        closeLabel="Close"
        primaryActionLabel="Continue"
        onRequestClose={() => undefined}
        visual={<span />}
      >
        <p>Welcome.</p>
      </OnboardingModal>,
    );

    expect(markup).toContain("hh-onboarding-shell");
    expect(markup).toContain("hh-onboarding-close");
    expect(markup).toContain("hh-onboarding-primary");
    expect(markup).toContain('data-reduced-motion="false"');
    expect(markup).not.toContain("aria-describedby");
  });
});
