export function formatAtlasCredits(value: number) {
  const rounded = Math.round(value * 100) / 100;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${Math.abs(rounded).toLocaleString("en-US", { maximumFractionDigits: 2 })} AC`;
}
