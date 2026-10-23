export type DayId = "push" | "pull" | "legs"

export type StepKind = "big" | "small"

export type Unit = "kg" | "lb"

export type Exercise = {
  id: string
  name: string
  short: string
  muscle: string
  muscleColor: string
  sets: number
  reps: string
  cue: string
  step: StepKind
}

export type FocusPart = {
  label: string
  color: string
}

export type WorkoutDay = {
  id: DayId
  name: string
  accent: string
  accentText: string
  focus: FocusPart[]
  tip: string
  exercises: Exercise[]
}

export type LoggedSet = {
  weightKg: number
  reps: number
}

export type LoggedExercise = {
  exerciseId: string
  sets: LoggedSet[]
}

export type Session = {
  id: string
  date: string
  dayId: DayId
  completedAt: string
  exercises: LoggedExercise[]
}

export type Miss = {
  id: string
  date: string
  reason: string
}

export type Store = {
  sessions: Session[]
  misses: Miss[]
  unit: Unit
}

export type SetDraft = {
  weightKg: number
  reps: number
  done: boolean
}

export type Draft = {
  dayId: DayId
  date: string
  exercises: { exerciseId: string; sets: SetDraft[] }[]
}
