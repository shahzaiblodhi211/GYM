import { daysBetween, daysSince, todayKey } from "@/lib/dates"
import { getDay, getExercise, repRange } from "@/lib/program"
import { addPlate, bestSet, comebackWeight, epley, formatKept, formatWeightUnit, retainedFraction, subPlate } from "@/lib/strength"
import type { DayId, Draft, Exercise, Session, Unit } from "@/lib/types"

export type Performance = {
  date: string
  completedAt: string
  sets: { weightKg: number; reps: number }[]
  best: { weightKg: number; reps: number }
  e1rm: number
}

export type SuggestMode = "first" | "up" | "hold" | "rebuild"

export type Suggestion = {
  mode: SuggestMode
  weightKg: number
  title: string
  detail: string
  daysOff: number
  retained: number
}

export function performances(sessions: Session[], exerciseId: string): Performance[] {
  return sessions
    .flatMap((session) => {
      const logged = session.exercises.find((exercise) => exercise.exerciseId === exerciseId)
      if (!logged?.sets.length) return []
      const best = bestSet(logged.sets)
      if (!best) return []
      return [
        {
          date: session.date,
          completedAt: session.completedAt,
          sets: logged.sets,
          best,
          e1rm: epley(best.weightKg, best.reps),
        },
      ]
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.completedAt.localeCompare(b.completedAt))
}

export function lastPerformance(sessions: Session[], exerciseId: string, onOrBefore?: string): Performance | null {
  const list = performances(sessions, exerciseId).filter((item) => !onOrBefore || item.date <= onOrBefore)
  return list.at(-1) ?? null
}

export function suggest(exercise: Exercise, history: Performance | null, unit: Unit, today = todayKey()): Suggestion {
  const { min, max } = repRange(exercise.reps)
  if (!history) {
    return {
      mode: "first",
      weightKg: 0,
      title: "First time",
      detail: `Pick a weight you can do for ${min}–${max} clean reps.`,
      daysOff: 0,
      retained: 1,
    }
  }

  const daysOff = daysSince(history.date, today)
  const retained = retainedFraction(daysOff)
  const last = history.best.weightKg
  const lighter = comebackWeight(last, daysOff, exercise.step, unit)
  const topSets = history.sets.filter((set) => Math.abs(set.weightKg - last) < 0.2)
  const allMissed = topSets.length > 0 && topSets.every((set) => set.reps < min)
  const someMissed = topSets.some((set) => set.reps < min)
  const hitTop =
    history.sets.length >= exercise.sets &&
    history.sets.every((set) => set.reps >= max && set.weightKg + 0.2 >= last)

  if (lighter + 0.05 < last) {
    return {
      mode: "rebuild",
      weightKg: lighter,
      title: `${daysOff} days off`,
      detail: `About ${formatKept(retained)} of ${formatWeightUnit(last, unit)} is left. Start at ${formatWeightUnit(lighter, unit)}.`,
      daysOff,
      retained,
    }
  }

  if (daysOff >= 11) {
    return {
      mode: "hold",
      weightKg: last,
      title: "Same weight",
      detail: `${daysOff} days off, but not enough to drop a plate. Use ${formatWeightUnit(last, unit)} and don't add load today.`,
      daysOff,
      retained,
    }
  }

  if (hitTop) {
    const next = addPlate(last, exercise.step, unit)
    return {
      mode: "up",
      weightKg: next,
      title: "Add weight",
      detail: `Every set hit ${max} reps. Go to ${formatWeightUnit(next, unit)}.`,
      daysOff,
      retained,
    }
  }

  if (allMissed) {
    const down = subPlate(last, exercise.step, unit)
    return {
      mode: "rebuild",
      weightKg: down,
      title: "Too heavy",
      detail: `Those reps were under ${min}. Drop to ${formatWeightUnit(down, unit)} and hit the range.`,
      daysOff,
      retained,
    }
  }

  if (someMissed) {
    return {
      mode: "hold",
      weightKg: last,
      title: "Same weight",
      detail: `Keep ${formatWeightUnit(last, unit)} until every set is at least ${min} reps.`,
      daysOff,
      retained,
    }
  }

  return {
    mode: "hold",
    weightKg: last,
    title: "Add a rep",
    detail: `Stay at ${formatWeightUnit(last, unit)} until all ${exercise.sets} sets hit ${max}.`,
    daysOff,
    retained,
  }
}

export function createDraft(dayId: DayId, date: string, sessions: Session[], unit: Unit): Draft {
  const day = getDay(dayId)
  return {
    dayId,
    date,
    exercises: day.exercises.map((exercise) => {
      const history = lastPerformance(sessions, exercise.id, date)
      const suggestion = suggest(exercise, history, unit, date)
      const { min } = repRange(exercise.reps)
      return {
        exerciseId: exercise.id,
        sets: Array.from({ length: exercise.sets }, (_, index) => ({
          weightKg: suggestion.weightKg,
          reps: history?.sets[index]?.reps ?? min,
          done: false,
        })),
      }
    }),
  }
}

export function sessionStreak(sessions: Session[], today = todayKey()): number {
  const dates = [...new Set(sessions.map((session) => session.date))].sort((a, b) => b.localeCompare(a))
  if (!dates.length) return 0
  if (daysBetween(dates[0], today) > 3) return 0
  let streak = 1
  for (let index = 1; index < dates.length; index += 1) {
    const gap = daysBetween(dates[index], dates[index - 1])
    if (gap > 0 && gap <= 3) streak += 1
    else break
  }
  return streak
}

export function mostRecentSession(sessions: Session[]): Session | null {
  return [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt))[0] ?? null
}

export function headlineFor(session: Session, unit: Unit): string {
  const first = session.exercises[0]
  if (!first) return ""
  const exercise = getExercise(first.exerciseId)
  const best = bestSet(first.sets)
  if (!exercise || !best) return exercise?.short ?? "Workout"
  return `${exercise.short} ${formatWeightUnit(best.weightKg, unit)} × ${best.reps}`
}

export function doneSetCount(draft: Draft): number {
  return draft.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.done && set.weightKg > 0 && set.reps > 0).length,
    0,
  )
}

export function forecastIds(sessions: Session[]): string[] {
  const logged = new Set(
    sessions.flatMap((session) => session.exercises.filter((exercise) => exercise.sets.length).map((exercise) => exercise.exerciseId)),
  )
  const keys = ["bench-press", "barbell-squat", "lat-pulldown"].filter((id) => logged.has(id))
  if (keys.length) return keys
  const latest = [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt))
    .flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId))[0]
  return latest ? [latest] : []
}
