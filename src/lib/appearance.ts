export const APPEARANCE_PREFERENCE_VERSION = 1;
export const APPEARANCE_PREFERENCE_KEY = `hh:appearance:v${APPEARANCE_PREFERENCE_VERSION}`;

export type Appearance = "dark" | "light";

export const DEFAULT_APPEARANCE: Appearance = "dark";

export const APPEARANCE_PALETTE = Object.freeze({
  dark: Object.freeze({
    base: "#09090b",
    themeColor: "#09090b",
  }),
  light: Object.freeze({
    base: "#F0EDE8",
    raised: "#F8F6F2",
    ink: "#18181E",
    accent: "#8A6517",
    muted: "#67697C",
    themeColor: "#F0EDE8",
  }),
} as const);

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

interface AppearancePersistenceOptions {
  key?: string;
  getLocalStorage?: () => StorageLike | null;
}

interface RestoreAppearanceOptions extends AppearancePersistenceOptions {
  targetDocument?: Document | null;
}

function browserLocalStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isAppearance(value: unknown): value is Appearance {
  return value === "dark" || value === "light";
}

export function readAppearancePreference({
  key = APPEARANCE_PREFERENCE_KEY,
  getLocalStorage = browserLocalStorage,
}: AppearancePersistenceOptions = {}): Appearance {
  try {
    const value = getLocalStorage()?.getItem(key);
    return isAppearance(value) ? value : DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function writeAppearancePreference(
  appearance: Appearance,
  {
    key = APPEARANCE_PREFERENCE_KEY,
    getLocalStorage = browserLocalStorage,
  }: AppearancePersistenceOptions = {},
): boolean {
  try {
    const storage = getLocalStorage();
    if (!storage) return false;
    storage.setItem(key, appearance);
    return true;
  } catch {
    return false;
  }
}

export function appearanceThemeColor(appearance: Appearance): string {
  return APPEARANCE_PALETTE[appearance].themeColor;
}

export function documentAppearance(targetDocument?: Document | null): Appearance {
  const resolvedDocument = targetDocument === undefined
    ? (typeof document === "undefined" ? null : document)
    : targetDocument;
  const value = resolvedDocument?.documentElement.dataset.theme;
  return isAppearance(value) ? value : DEFAULT_APPEARANCE;
}

export function applyAppearance(
  appearance: Appearance,
  targetDocument?: Document | null,
): void {
  const resolvedDocument = targetDocument === undefined
    ? (typeof document === "undefined" ? null : document)
    : targetDocument;
  if (!resolvedDocument) return;

  resolvedDocument.documentElement.dataset.theme = appearance;
  resolvedDocument.documentElement.style.colorScheme = appearance;
  resolvedDocument
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", appearanceThemeColor(appearance));
}

/**
 * Restores the explicit device preference before React mounts. Storage access
 * is deliberately contained so private-mode and policy failures never block
 * the application shell.
 */
export function restoreAppearance({
  targetDocument,
  ...persistenceOptions
}: RestoreAppearanceOptions = {}): Appearance {
  const appearance = readAppearancePreference(persistenceOptions);
  applyAppearance(appearance, targetDocument);
  return appearance;
}
