export const ONBOARDING_DISMISSAL_VERSION = 2;
export const ONBOARDING_DISMISSAL_KEY = `hh:onboarding:v${ONBOARDING_DISMISSAL_VERSION}:dismissed`;

const DISMISSED_VALUE = "true";

export type OnboardingCloseReason = "close-button" | "primary-action" | "escape";
export type OnboardingPersistenceTier = "local" | "session" | "memory";

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

interface OnboardingPersistenceOptions {
  key?: string;
  getLocalStorage?: () => StorageLike | null;
  getSessionStorage?: () => StorageLike | null;
}

export interface OnboardingPersistence {
  isDismissed: () => boolean;
  dismiss: () => OnboardingPersistenceTier;
}

function browserStorage(kind: "localStorage" | "sessionStorage"): StorageLike | null {
  if (typeof window === "undefined") return null;

  try {
    return window[kind];
  } catch {
    return null;
  }
}

function readDismissal(
  getStorage: () => StorageLike | null,
  key: string,
): boolean {
  try {
    return getStorage()?.getItem(key) === DISMISSED_VALUE;
  } catch {
    return false;
  }
}

function writeDismissal(
  getStorage: () => StorageLike | null,
  key: string,
): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(key, DISMISSED_VALUE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a version-scoped onboarding record with progressively safer storage.
 * The in-memory tier keeps dismissal effective for the current page session even
 * when both Web Storage APIs are blocked by the browser.
 */
export function createOnboardingPersistence({
  key = ONBOARDING_DISMISSAL_KEY,
  getLocalStorage = () => browserStorage("localStorage"),
  getSessionStorage = () => browserStorage("sessionStorage"),
}: OnboardingPersistenceOptions = {}): OnboardingPersistence {
  let memoryDismissed = false;

  return {
    isDismissed() {
      return readDismissal(getLocalStorage, key)
        || readDismissal(getSessionStorage, key)
        || memoryDismissed;
    },

    dismiss() {
      // Keep the current page session dismissed even if a browser accepts a
      // write but subsequently blocks reads (private-mode policies can shift).
      memoryDismissed = true;
      if (writeDismissal(getLocalStorage, key)) return "local";
      if (writeDismissal(getSessionStorage, key)) return "session";

      return "memory";
    },
  };
}

export function isExplicitOnboardingDismissal(reason: OnboardingCloseReason): boolean {
  return reason === "close-button" || reason === "primary-action";
}

export const onboardingPersistence = createOnboardingPersistence();
