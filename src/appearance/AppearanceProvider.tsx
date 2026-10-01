import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyAppearance,
  documentAppearance,
  writeAppearancePreference,
  type Appearance,
} from "../lib/appearance";
import { AppearanceContext } from "./AppearanceContext";

interface AppearanceProviderProps {
  children: ReactNode;
  initialAppearance?: Appearance;
}

export function AppearanceProvider({
  children,
  initialAppearance,
}: AppearanceProviderProps) {
  const [appearance, setAppearanceState] = useState<Appearance>(
    () => initialAppearance ?? documentAppearance(),
  );

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  const setAppearance = useCallback((nextAppearance: Appearance): void => {
    // Mutate root semantics before notifying consumers so canvas effects read
    // the new token values during the same committed update.
    applyAppearance(nextAppearance);
    writeAppearancePreference(nextAppearance);
    setAppearanceState(nextAppearance);
  }, []);

  const value = useMemo(
    () => ({ appearance, setAppearance }),
    [appearance, setAppearance],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}
