import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppearanceProvider } from "../appearance/AppearanceProvider";
import { I18nProvider } from "../i18n/I18nProvider";
import OnboardingModal from "./OnboardingModal";

function renderModal(modal: ReactNode, appearance: "dark" | "light" = "dark"): string {
  return renderToStaticMarkup(
    <AppearanceProvider initialAppearance={appearance}>
      <I18nProvider>{modal}</I18nProvider>
    </AppearanceProvider>,
  );
}

describe("OnboardingModal", () => {
  it("renders a named modal with an explicit dismissal action and scroll boundary", () => {
    const markup = renderModal(
      <OnboardingModal
        brandLabel="HARMONY HASH — TONARI LABS"
        title="HARMONY HASH"
        description="Harmony doesn't have to be hard."
        closeLabel="Close Harmony Hash introduction"
        primaryActionLabel="START HASHING"
        secondaryActionLabel="TAKE A TOUR"
        onRequestClose={() => undefined}
        onSecondaryAction={() => undefined}
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
    expect(markup).toContain('data-onboarding-visual="true"');
    expect(markup).toContain("max-height:calc(100dvh - (2 * var(--space-4)))");
    expect(markup).toContain("START HASHING");
    expect(markup).toContain("TAKE A TOUR");
    expect(markup).toContain('/hh_logo.png');
  });

  it("exposes the token-backed surface and control hooks", () => {
    const markup = renderModal(
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

  it.each(["dark", "light"] as const)(
    "exposes an accessible, text-labeled appearance group with %s selected",
    (appearance) => {
      const markup = renderModal(
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
        appearance,
      );

      expect(markup).toMatch(/<div[^>]+role="group"[^>]+aria-labelledby="[^"]+"/);
      expect(markup).toContain("Appearance");
      expect(markup).toContain("Dark appearance");
      expect(markup).toContain("Light appearance");
      expect(markup).toContain(`data-active="true" aria-pressed="true"`);
      expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
      expect(markup.match(/hh-onboarding-appearance__option"/g)).toHaveLength(2);
    },
  );
});
