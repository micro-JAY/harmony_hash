import { describe, expect, it, vi } from "vitest";
import {
  ONBOARDING_DISMISSAL_KEY,
  createOnboardingPersistence,
  isExplicitOnboardingDismissal,
} from "./onboardingPersistence";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("onboarding persistence", () => {
  it("treats a missing record as a first visit", () => {
    const local = new MemoryStorage();
    const persistence = createOnboardingPersistence({ getLocalStorage: () => local });

    expect(persistence.isDismissed()).toBe(false);
  });

  it("recognizes a returning visitor from the current versioned record", () => {
    const local = new MemoryStorage();
    local.setItem(ONBOARDING_DISMISSAL_KEY, "true");

    const persistence = createOnboardingPersistence({ getLocalStorage: () => local });

    expect(persistence.isDismissed()).toBe(true);
  });

  it("persists explicit dismissal in local storage when available", () => {
    const local = new MemoryStorage();
    const persistence = createOnboardingPersistence({ getLocalStorage: () => local });

    expect(persistence.dismiss()).toBe("local");
    expect(local.getItem(ONBOARDING_DISMISSAL_KEY)).toBe("true");
    expect(persistence.isDismissed()).toBe(true);
  });

  it("does not treat older onboarding versions as current dismissal", () => {
    const local = new MemoryStorage();
    local.setItem("hh:onboarding:v0:dismissed", "true");

    const persistence = createOnboardingPersistence({ getLocalStorage: () => local });

    expect(persistence.isDismissed()).toBe(false);
  });

  it("falls back to session storage when local storage throws", () => {
    const session = new MemoryStorage();
    const persistence = createOnboardingPersistence({
      getLocalStorage: () => ({
        getItem: () => {
          throw new DOMException("blocked", "SecurityError");
        },
        setItem: () => {
          throw new DOMException("blocked", "SecurityError");
        },
      }),
      getSessionStorage: () => session,
    });

    expect(() => persistence.isDismissed()).not.toThrow();
    expect(persistence.dismiss()).toBe("session");
    expect(session.getItem(ONBOARDING_DISMISSAL_KEY)).toBe("true");
    expect(persistence.isDismissed()).toBe(true);
  });

  it("reads a prior session fallback even when local storage is empty", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    session.setItem(ONBOARDING_DISMISSAL_KEY, "true");

    const persistence = createOnboardingPersistence({
      getLocalStorage: () => local,
      getSessionStorage: () => session,
    });

    expect(persistence.isDismissed()).toBe(true);
  });

  it("falls back to memory when both storage APIs are unavailable", () => {
    const unavailable = vi.fn(() => null);
    const persistence = createOnboardingPersistence({
      getLocalStorage: unavailable,
      getSessionStorage: unavailable,
    });

    expect(persistence.isDismissed()).toBe(false);
    expect(persistence.dismiss()).toBe("memory");
    expect(persistence.isDismissed()).toBe(true);
  });

  it("keeps the current session dismissed if storage reads become blocked", () => {
    const persistence = createOnboardingPersistence({
      getLocalStorage: () => ({
        getItem: () => {
          throw new DOMException("blocked", "SecurityError");
        },
        setItem: () => undefined,
      }),
      getSessionStorage: () => null,
    });

    expect(persistence.dismiss()).toBe("local");
    expect(persistence.isDismissed()).toBe(true);
  });

  it("only classifies labeled close controls as explicit dismissal", () => {
    expect(isExplicitOnboardingDismissal("close-button")).toBe(true);
    expect(isExplicitOnboardingDismissal("primary-action")).toBe(true);
    expect(isExplicitOnboardingDismissal("escape")).toBe(false);
  });
});
