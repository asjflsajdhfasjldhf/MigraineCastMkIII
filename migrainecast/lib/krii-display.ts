export function toKriiPercent(value: number | null | undefined): number {
  return Math.round((value ?? 0) * 100);
}

export function roundPercentValue(value: number | null | undefined): number {
  return Math.round(value ?? 0);
}