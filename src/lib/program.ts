import type { DayId, WorkoutDay } from "@/lib/types"

const chest = "#ff8f8f"
const shoulders = "#ffb07a"
const triceps = "#ffe08a"
const back = "#8ec2ff"
const midBack = "#7ddea8"
const rearDelts = "#ff8f9a"
const biceps = "#d7b4ff"
const quads = "#ffe08a"
const hamstrings = "#7ddea8"
const glutes = "#d7b4ff"
const calves = "#ffb07a"

export const MISS_REASONS = ["Busy", "Sick", "Travel", "Sore", "Skipped"] as const

export const DAYS: WorkoutDay[] = [
  {
    id: "push",
    name: "Push",
    accent: "#f5c518",
    accentText: "#1a1503",
    focus: [
      { label: "Chest", color: chest },
      { label: "Shoulders", color: shoulders },
      { label: "Triceps", color: triceps },
    ],
    tip: "Rest 60–90 sec. Add weight when every set hits the top of the range.",
    exercises: [
      {
        id: "bench-press",
        name: "Bench Press",
        short: "Bench",
        muscle: "Chest",
        muscleColor: chest,
        sets: 4,
        reps: "6-8",
        step: "small",
        cue: "Lower the bar to your mid-chest. Press up explosively. Keep your feet planted.",
      },
      {
        id: "incline-db-press",
        name: "Incline Dumbbell Press",
        short: "Incline",
        muscle: "Chest",
        muscleColor: chest,
        sets: 3,
        reps: "8-10",
        step: "small",
        cue: "Set the bench at 30–45°. Lower the dumbbells to your upper chest. Press up and squeeze.",
      },
      {
        id: "cable-fly",
        name: "Chest Fly (Cable)",
        short: "Fly",
        muscle: "Chest",
        muscleColor: chest,
        sets: 3,
        reps: "12-15",
        step: "small",
        cue: "Keep a slight bend in your elbows. Bring your hands together and squeeze your chest.",
      },
      {
        id: "db-shoulder-press",
        name: "Shoulder Press (Dumbbell)",
        short: "Press",
        muscle: "Shoulders",
        muscleColor: shoulders,
        sets: 3,
        reps: "8-10",
        step: "small",
        cue: "Press the dumbbells overhead. Don't arch your back. Keep your core tight.",
      },
      {
        id: "lateral-raise",
        name: "Lateral Raises",
        short: "Laterals",
        muscle: "Shoulders",
        muscleColor: shoulders,
        sets: 3,
        reps: "12-15",
        step: "small",
        cue: "Raise the dumbbells to shoulder height. Use a light weight and keep the form strict.",
      },
      {
        id: "rope-pushdown",
        name: "Triceps Pushdown",
        short: "Pushdown",
        muscle: "Triceps",
        muscleColor: triceps,
        sets: 3,
        reps: "10-12",
        step: "small",
        cue: "Keep your elbows at your sides. Push down and fully extend. Squeeze your triceps.",
      },
    ],
  },
  {
    id: "pull",
    name: "Pull",
    accent: "#3ddc6a",
    accentText: "#06210c",
    focus: [
      { label: "Back", color: back },
      { label: "Rear delts", color: rearDelts },
      { label: "Biceps", color: biceps },
    ],
    tip: "Control the weight. Don't swing it. Add load only when the reps stay clean.",
    exercises: [
      {
        id: "lat-pulldown",
        name: "Lat Pulldown",
        short: "Pulldown",
        muscle: "Lats",
        muscleColor: back,
        sets: 4,
        reps: "8-12",
        step: "small",
        cue: "Grip wider than your shoulders. Pull to your upper chest and squeeze your lats. This stands in for pull-ups.",
      },
      {
        id: "barbell-row",
        name: "Barbell Row",
        short: "Row",
        muscle: "Mid back",
        muscleColor: midBack,
        sets: 4,
        reps: "6-10",
        step: "small",
        cue: "Bend at the hips and keep your back straight. Pull toward your lower chest and squeeze.",
      },
      {
        id: "seated-row",
        name: "Seated Cable Row",
        short: "Cable row",
        muscle: "Mid back",
        muscleColor: midBack,
        sets: 3,
        reps: "8-12",
        step: "small",
        cue: "Sit tall. Pull the handle toward your stomach and squeeze your shoulder blades.",
      },
      {
        id: "face-pull",
        name: "Face Pull",
        short: "Face pull",
        muscle: "Rear delts",
        muscleColor: rearDelts,
        sets: 3,
        reps: "12-15",
        step: "small",
        cue: "Use the rope. Pull toward your face, flare your elbows, and squeeze your rear delts.",
      },
      {
        id: "barbell-curl",
        name: "Barbell Curl",
        short: "Curl",
        muscle: "Biceps",
        muscleColor: biceps,
        sets: 3,
        reps: "8-12",
        step: "small",
        cue: "Hold the bar at shoulder width. Curl it up and squeeze your biceps.",
      },
      {
        id: "hammer-curl",
        name: "Hammer Curl",
        short: "Hammer",
        muscle: "Biceps",
        muscleColor: biceps,
        sets: 3,
        reps: "10-12",
        step: "small",
        cue: "Neutral grip. Curl the dumbbells up and squeeze.",
      },
    ],
  },
  {
    id: "legs",
    name: "Legs",
    accent: "#ff7a3c",
    accentText: "#1c0c05",
    focus: [
      { label: "Quads", color: quads },
      { label: "Hamstrings", color: hamstrings },
      { label: "Glutes", color: glutes },
      { label: "Calves", color: calves },
    ],
    tip: "Full range first. Then add weight. Rest 60–90 sec between sets.",
    exercises: [
      {
        id: "barbell-squat",
        name: "Barbell Squat",
        short: "Squat",
        muscle: "Quads",
        muscleColor: quads,
        sets: 4,
        reps: "6-8",
        step: "big",
        cue: "Bar on your upper back. Feet about shoulder width. Squat until your thighs are parallel, then drive through your heels.",
      },
      {
        id: "leg-press",
        name: "Leg Press",
        short: "Leg press",
        muscle: "Quads",
        muscleColor: quads,
        sets: 3,
        reps: "8-10",
        step: "big",
        cue: "Feet shoulder width on the platform. Lower until your knees are about 90°, then push the platform away.",
      },
      {
        id: "romanian-deadlift",
        name: "Romanian Deadlift",
        short: "RDL",
        muscle: "Hamstrings",
        muscleColor: hamstrings,
        sets: 3,
        reps: "8-10",
        step: "big",
        cue: "Hinge at the hips with a soft knee bend. Lower the bar along your legs until your hamstrings stretch, then stand by squeezing your glutes.",
      },
      {
        id: "leg-extension",
        name: "Leg Extension",
        short: "Extension",
        muscle: "Quads",
        muscleColor: quads,
        sets: 3,
        reps: "12-15",
        step: "small",
        cue: "Back against the pad. Extend and squeeze your quads at the top. Lower slowly.",
      },
      {
        id: "lying-leg-curl",
        name: "Lying Leg Curl",
        short: "Leg curl",
        muscle: "Hamstrings",
        muscleColor: hamstrings,
        sets: 3,
        reps: "10-12",
        step: "small",
        cue: "Lie face down and hook your ankles under the pad. Curl by squeezing your hamstrings. Lower slowly.",
      },
      {
        id: "standing-calf-raise",
        name: "Standing Calf Raise",
        short: "Calves",
        muscle: "Calves",
        muscleColor: calves,
        sets: 4,
        reps: "12-15",
        step: "small",
        cue: "Stand on the platform. Raise your heels, squeeze at the top, and lower slowly.",
      },
    ],
  },
]

export const DAY_ORDER: DayId[] = ["push", "pull", "legs"]

export const FORECAST_IDS = ["bench-press", "barbell-squat", "lat-pulldown"]

export function getDay(id: DayId): WorkoutDay {
  const day = DAYS.find((item) => item.id === id)
  if (!day) throw new Error(`Unknown day ${id}`)
  return day
}

export function getExercise(id: string) {
  for (const day of DAYS) {
    const exercise = day.exercises.find((item) => item.id === id)
    if (exercise) return exercise
  }
  return undefined
}

export function nextDayId(last: DayId | null): DayId {
  if (!last) return "push"
  const index = DAY_ORDER.indexOf(last)
  return DAY_ORDER[(index + 1) % DAY_ORDER.length]
}

export function repRange(reps: string): { min: number; max: number } {
  const match = reps.match(/(\d+)\s*[–-]\s*(\d+)/)
  if (!match) return { min: 8, max: 12 }
  return { min: Number(match[1]), max: Number(match[2]) }
}

export function prettyReps(reps: string): string {
  return reps.replace("-", "–")
}
