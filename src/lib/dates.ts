export const WEEK_LETTERS = ["M", "T", "W", "T", "F", "S", "S"]

export function todayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / 86_400_000)
}

export function daysSince(date: string, today = todayKey()): number {
  return Math.max(0, daysBetween(date, today))
}

export function formatPretty(date: string): string {
  return parseKey(date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function formatMonth(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
}

export function relativeDay(date: string, today = todayKey()): string {
  const gap = daysBetween(date, today)
  if (gap === 0) return "Today"
  if (gap === 1) return "Yesterday"
  if (gap > 1 && gap < 7) {
    return parseKey(date).toLocaleDateString("en-GB", { weekday: "long" })
  }
  return formatPretty(date)
}

export function weekKeys(today = todayKey()): string[] {
  const date = parseKey(today)
  const mondayOffset = (date.getDay() + 6) % 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - mondayOffset)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    return todayKey(day)
  })
}

export function monthCells(year: number, month: number): Array<number | null> {
  const startPad = (new Date(year, month, 1).getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  const cells: Array<number | null> = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: count }, (_, index) => index + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function inMonth(date: string, year: number, month: number): boolean {
  const value = parseKey(date)
  return value.getFullYear() === year && value.getMonth() === month
}
