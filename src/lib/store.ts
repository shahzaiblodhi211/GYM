import { DAYS } from "@/lib/program"
import type { DayId, Draft, LoggedExercise, LoggedSet, Miss, Session, SetDraft, Store, Unit } from "@/lib/types"

export const STORE_KEY = "gym.v1"
export const DRAFT_KEY = "gym.draft.v1"

export const EMPTY_STORE: Store = {
  sessions: [],
  misses: [],
  unit: "kg",
}

export const EMPTY_STORE_RAW = JSON.stringify(EMPTY_STORE)

function isDayId(value: unknown): value is DayId {
  return value === "push" || value === "pull" || value === "legs"
}

function isUnit(value: unknown): value is Unit {
  return value === "kg" || value === "lb"
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parseSet(value: unknown): LoggedSet | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const weightKg = record.weightKg
  const reps = record.reps
  if (typeof weightKg !== "number" || typeof reps !== "number") return null
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return null
  if (weightKg <= 0 || weightKg > 2000 || reps <= 0 || reps > 50) return null
  return { weightKg, reps: Math.round(reps) }
}

function parseLoggedExercise(value: unknown): LoggedExercise | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (typeof record.exerciseId !== "string" || !Array.isArray(record.sets)) return null
  const sets = record.sets.flatMap((set) => {
    const parsed = parseSet(set)
    return parsed ? [parsed] : []
  })
  if (!sets.length) return null
  return { exerciseId: record.exerciseId, sets }
}

function parseSession(value: unknown): Session | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (typeof record.id !== "string" || !isDateKey(record.date) || !isDayId(record.dayId)) return null
  if (!Array.isArray(record.exercises)) return null
  const exercises = record.exercises.flatMap((exercise) => {
    const parsed = parseLoggedExercise(exercise)
    return parsed ? [parsed] : []
  })
  if (!exercises.length) return null
  const completedAt = typeof record.completedAt === "string" ? record.completedAt : `${record.date}T00:00:00.000Z`
  return {
    id: record.id,
    date: record.date,
    dayId: record.dayId,
    completedAt,
    exercises,
  }
}

function parseMiss(value: unknown): Miss | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (typeof record.id !== "string" || !isDateKey(record.date)) return null
  const reason = typeof record.reason === "string" && record.reason.trim() ? record.reason.trim() : "Skipped"
  return { id: record.id, date: record.date, reason: reason.slice(0, 40) }
}

function parseDraftSet(value: unknown): SetDraft | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const weightKg = typeof record.weightKg === "number" && Number.isFinite(record.weightKg) ? record.weightKg : 0
  const reps = typeof record.reps === "number" && Number.isFinite(record.reps) ? record.reps : 0
  return {
    weightKg: Math.max(0, Math.min(2000, weightKg)),
    reps: Math.max(0, Math.min(30, Math.round(reps))),
    done: Boolean(record.done),
  }
}

export function parseStore(raw: string): Store {
  try {
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== "object") return EMPTY_STORE
    const record = data as Record<string, unknown>
    const sessions = Array.isArray(record.sessions)
      ? record.sessions.flatMap((session) => {
          const parsed = parseSession(session)
          return parsed ? [parsed] : []
        })
      : []
    const misses = Array.isArray(record.misses)
      ? record.misses.flatMap((miss) => {
          const parsed = parseMiss(miss)
          return parsed ? [parsed] : []
        })
      : []
    const byDate = new Map<string, Miss>()
    for (const miss of misses) byDate.set(miss.date, miss)
    return {
      unit: isUnit(record.unit) ? record.unit : "kg",
      sessions,
      misses: [...byDate.values()],
    }
  } catch {
    return EMPTY_STORE
  }
}

export function parseDraft(raw: string): Draft | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== "object") return null
    const record = data as Record<string, unknown>
    if (!isDayId(record.dayId) || !isDateKey(record.date) || !Array.isArray(record.exercises)) return null
    const day = DAYS.find((item) => item.id === record.dayId)
    if (!day) return null
    const incoming = record.exercises.flatMap((exercise) => {
      if (!exercise || typeof exercise !== "object") return []
      const item = exercise as Record<string, unknown>
      if (typeof item.exerciseId !== "string" || !Array.isArray(item.sets)) return []
      const sets = item.sets.flatMap((set) => {
        const parsed = parseDraftSet(set)
        return parsed ? [parsed] : []
      })
      return [{ exerciseId: item.exerciseId, sets }]
    })

    return {
      dayId: record.dayId,
      date: record.date,
      exercises: day.exercises.map((exercise) => {
        const existing = incoming.find((item) => item.exerciseId === exercise.id)
        return {
          exerciseId: exercise.id,
          sets: Array.from({ length: exercise.sets }, (_, index) => {
            const set = existing?.sets[index]
            const weightKg = set?.weightKg ?? 0
            const reps = set?.reps ?? 0
            return {
              weightKg,
              reps,
              done: Boolean(set?.done) && weightKg > 0 && reps > 0,
            }
          }),
        }
      }),
    }
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string) {
  localStorage.setItem(key, value)
  window.dispatchEvent(new Event(key))
}

export function addSession(store: Store, session: Session): Store {
  return {
    ...store,
    sessions: [...store.sessions, session],
    misses: store.misses.filter((miss) => miss.date !== session.date),
  }
}

export function upsertMiss(store: Store, miss: Miss): Store {
  return {
    ...store,
    misses: [...store.misses.filter((item) => item.date !== miss.date), miss],
  }
}
