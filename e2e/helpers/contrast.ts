function rgbChannels(color: string): readonly [number, number, number] {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
  if (channels.length !== 3) throw new Error(`Expected an RGB color, received ${color}`);
  return [channels[0], channels[1], channels[2]];
}

function luminance(color: string): number {
  const [red, green, blue] = rgbChannels(color).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}
