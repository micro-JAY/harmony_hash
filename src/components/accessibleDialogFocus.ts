/** Returns the focus index a modal must force, or null for native Tab order. */
export function dialogFocusTrapTargetIndex(
  focusableCount: number,
  activeIndex: number,
  movingBackward: boolean,
): number | null {
  if (focusableCount <= 0) return null;
  if (activeIndex < 0) return movingBackward ? focusableCount - 1 : 0;
  if (movingBackward && activeIndex === 0) return focusableCount - 1;
  if (!movingBackward && activeIndex === focusableCount - 1) return 0;
  return null;
}
