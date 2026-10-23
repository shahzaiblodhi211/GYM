import type { LoggedSet, StepKind, Unit } from "@/lib/types"

const LB_PER_KG = 2.2046226218

/** Share of strength still there after time away from a lift.
 *  Rough estimate, not a test:
 *  the first 10 days hold, then about 0.4% per day (around 3% a week),
 *  and it never drops below 75% in this model.
 */
export function retainedFraction(daysOff: number): number {
  if (daysOff <= 10) return 1
  return Math.max(0.75, 1 - (daysOff - 10) * 0.004)
}

export function formatKept(retained: number): string {
  const percent = retained * 100
  if (percent >= 99.5) return "100%"
  return `${Math.round(percent)}%`
}

export function roundTo(value: number, step: number): number {
  if (step <= 0) return value
  const scaled = Math.round((value / step) * 1e8) / 1e8
  return Math.round(scaled) * step
}

export function toKg(display: number, unit: Unit): number {
  return unit === "lb" ? display / LB_PER_KG : display
}

export function fromKg(kg: number, unit: Unit): number {
  return unit === "lb" ? kg * LB_PER_KG : kg
}

export function displayStep(kind: StepKind, unit: Unit): number {
  if (unit === "lb") return kind === "big" ? 10 : 5
  return kind === "big" ? 5 : 2.5
}

export function formatNumber(value: number): string {
  const rounded = roundTo(value, 0.1)
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(1)
}

export function formatWeight(kg: number, unit: Unit): string {
  if (!kg) return ""
  const step = unit === "lb" ? 1 : 0.5
  return formatNumber(roundTo(fromKg(kg, unit), step))
}

export function formatWeightUnit(kg: number, unit: Unit): string {
  const value = formatWeight(kg, unit)
  if (!value) return "—"
  return `${value} ${unit}`
}

export function formatSignedWeight(deltaKg: number, unit: Unit): string {
  const text = formatWeight(Math.abs(deltaKg), unit)
  if (!text || text === "0") return "Same weight"
  return `${deltaKg > 0 ? "+" : "−"}${text} ${unit}`
}

export function epley(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0
  if (reps === 1) return weightKg
  return weightKg * (1 + reps / 30)
}

export function bestSet(sets: LoggedSet[]): LoggedSet | null {
  if (!sets.length) return null
  return [...sets].sort((a, b) => b.weightKg - a.weightKg || b.reps - a.reps)[0]
}

export function addPlate(kg: number, kind: StepKind, unit: Unit): number {
  const step = displayStep(kind, unit)
  if (kg <= 0) return toKg(step, unit)
  const shown = roundTo(fromKg(kg, unit), unit === "lb" ? 1 : 0.5)
  return toKg(shown + step, unit)
}

export function subPlate(kg: number, kind: StepKind, unit: Unit): number {
  const step = displayStep(kind, unit)
  if (kg <= 0) return 0
  const shown = roundTo(fromKg(kg, unit), unit === "lb" ? 1 : 0.5)
  return toKg(Math.max(step, shown - step), unit)
}

export function parseDisplayWeight(raw: string, unit: Unit): number | null {
  const cleaned = raw.trim().replace(",", ".")
  if (cleaned === "") return 0
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === ".") return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0 || value > 2000) return null
  return toKg(value, unit)
}

/** Practical comeback load. Stays at the last weight until the estimated
 *  loss is at least half a plate jump, then snaps to a loadable step.
 */
export function comebackWeight(lastKg: number, daysOff: number, kind: StepKind, unit: Unit): number {
  const step = displayStep(kind, unit)
  const stepKg = toKg(step, unit)
  const retained = retainedFraction(daysOff)
  const lossKg = lastKg * (1 - retained)
  if (daysOff < 11 || lossKg < stepKg / 2) return lastKg

  const rawDisplay = fromKg(lastKg * retained, unit)
  const lastDisplay = roundTo(fromKg(lastKg, unit), unit === "lb" ? 1 : 0.5)
  let snapped = roundTo(rawDisplay, step)
  if (snapped >= lastDisplay - 0.01) snapped = lastDisplay - step
  return toKg(Math.max(step, snapped), unit)
}
