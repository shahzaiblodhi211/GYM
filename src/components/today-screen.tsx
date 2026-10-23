"use client"

import { useState } from "react"
import { daysSince, relativeDay, todayKey } from "@/lib/dates"
import { DAYS, getDay, getExercise } from "@/lib/program"
import { comebackWeight, formatKept, formatWeight, retainedFraction } from "@/lib/strength"
import { forecastIds, headlineFor, lastPerformance } from "@/lib/training"
import type { DayId, Draft, Store } from "@/lib/types"
import { InstallHint } from "@/components/pwa"

const MUSCLES: Record<DayId, { src: string; label: string }[]> = {
  push: [
    { src: "/muscles/chest.png", label: "Chest" },
    { src: "/muscles/triceps.png", label: "Triceps" },
  ],
  pull: [
    { src: "/muscles/back.png", label: "Back" },
    { src: "/muscles/biceps.png", label: "Biceps" },
  ],
  legs: [
    { src: "/muscles/quads.png", label: "Quadriceps" },
    { src: "/muscles/hamstrings.png", label: "Hamstrings" },
    { src: "/muscles/glutes.png", label: "Glutes" },
    { src: "/muscles/calves.png", label: "Calves" },
  ],
}

type TodayProps = {
  store: Store
  draft: Draft | null
  onStart: (dayId: DayId, date?: string) => void
  onResume: () => void
  onDiscard: () => void
}

export function TodayScreen({ store, draft, onStart, onResume, onDiscard }: TodayProps) {
  const today = todayKey()
  const [discardArmed, setDiscardArmed] = useState(false)
  const recent = [...store.sessions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt))
    .slice(0, 3)

  return (
    <div className="pt-[max(1.25rem,env(safe-area-inset-top))]">
      <InstallHint />

      <div className="mt-5 flex flex-col gap-3">
        {DAYS.map((item) => {
          const muscles = MUSCLES[item.id]
          const isDraft = draft?.dayId === item.id
          const previous = [...store.sessions]
            .filter((session) => session.dayId === item.id)
            .sort((a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt))[0]
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (isDraft ? onResume() : onStart(item.id, today))}
              className="bg-transparent text-left outline-none"
            >
              <span className="flex items-baseline justify-between">
                <span className="text-base font-medium">{item.name}</span>
                <span className="text-xs text-muted">{isDraft ? "Resume" : `${item.exercises.length} exercises`}</span>
              </span>
              <span className="mt-2 grid grid-cols-2 gap-3">
                {muscles.map((muscle) => (
                  <span key={muscle.label} className="text-center">
                    <img src={muscle.src} alt="" className="w-full" />
                    <span className="mt-1.5 block text-[11px] text-[#bdbab4]">{muscle.label}</span>
                  </span>
                ))}
              </span>
              {previous ? <span className="mt-1 block text-xs text-muted">{headlineFor(previous, store.unit)}</span> : null}
            </button>
          )
        })}
      </div>

      {draft && discardArmed ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setDiscardArmed(false)} className="h-11 rounded-2xl bg-white/6 text-sm">
            Keep
          </button>
          <button type="button" onClick={onDiscard} className="h-11 rounded-2xl text-sm text-miss">
            Discard workout
          </button>
        </div>
      ) : draft ? (
        <button type="button" onClick={() => setDiscardArmed(true)} className="mt-3 h-10 w-full text-sm text-muted">
          Discard workout
        </button>
      ) : null}

      <StrengthRow store={store} today={today} />

      {recent.length > 0 ? (
        <section className="mt-8">
          <p className="text-xs tracking-[0.16em] text-muted uppercase">Recent</p>
          <ul className="mt-2">
            {recent.map((session) => {
              const loggedDay = getDay(session.dayId)
              return (
                <li key={session.id} className="flex items-center gap-3 border-b border-white/8 py-3.5">
                  <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: loggedDay.accent }} />
                  <span className="w-12 shrink-0">{loggedDay.name}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">{headlineFor(session, store.unit)}</span>
                  <span className="shrink-0 text-sm text-muted">{relativeDay(session.date, today)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function StrengthRow({ store, today }: { store: Store; today: string }) {
  const ids = forecastIds(store.sessions)
  if (!ids.length) return null

  return (
    <section className="mt-8">
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Kept</p>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4">
        {ids.map((id) => {
          const exercise = getExercise(id)
          const history = exercise ? lastPerformance(store.sessions, exercise.id, today) : null
          if (!exercise || !history) return null
          const daysOff = daysSince(history.date, today)
          const kept = retainedFraction(daysOff)
          const next = comebackWeight(history.best.weightKg, daysOff + 21, exercise.step, store.unit)
          return (
            <article key={id} className="min-w-[168px] flex-1 rounded-3xl bg-card px-4 py-4">
              <p className="text-sm text-muted">{exercise.short}</p>
              <p className="mt-2 font-display text-5xl leading-none">{formatKept(kept)}</p>
              <p className="mt-3 text-sm tabular-nums">
                {formatWeight(history.best.weightKg, store.unit)}
                <span className="text-muted"> {store.unit}</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                3w · {formatWeight(next, store.unit)} {store.unit}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
