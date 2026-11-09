type Frame = { top: number; height: number };

export function inputScrollAdjustment(viewport: Frame, input: Frame) {
  const visibleTop = viewport.top + 12;
  const visibleBottom = viewport.top + viewport.height - 12;
  if (input.height > visibleBottom - visibleTop || input.top < visibleTop)
    return input.top - visibleTop;
  return Math.max(0, input.top + input.height - visibleBottom);
}
