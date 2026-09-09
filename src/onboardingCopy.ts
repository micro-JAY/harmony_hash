export const ONBOARDING_DESCRIPTION_KEYS = [
  "Harmony doesn't have to be hard.",
  "Find the harmony inside every chord.",
  "Start with a chord. Discover where it wants to go.",
  "Every chord is a doorway to another.",
  "Follow the tension. Find the release.",
  "Build progressions by ear, shape, and feel.",
  "Try a chord. Hear what comes next.",
  "Harmony is a map, not a maze.",
] as const;

export function randomOnboardingDescription(random = Math.random) {
  return ONBOARDING_DESCRIPTION_KEYS[
    Math.floor(random() * ONBOARDING_DESCRIPTION_KEYS.length)
  ] ?? ONBOARDING_DESCRIPTION_KEYS[0];
}
