"use client"

import { useState } from "react"
import { daysSince, formatPretty, relativeDay, todayKey, weekKeys, WEEK_LETTERS } from "@/lib/dates"
import { DAYS, getDay, getExercise, MISS_REASONS, nextDayId } from "@/lib/program"
import { comebackWeight, formatKept, formatWeight, retainedFraction } from "@/lib/strength"
import { forecastIds, headlineFor, lastPerformance, mostRecentSession } from "@/lib/training"
import type { DayId, Draft, Store, Unit } from "@/lib/types"
import { cx } from "@/components/ui"

type TodayProps = {
  store: Store
  draft: Draft | null
  onStart: (dayId: DayId, date?: string) => void
  onResume: () => void
  onDiscard: () => void
  onUnit: (unit: Unit) => void
  onMiss: (date: string, reason: string) => void
}

export function TodayScreen({ store, draft, onStart, onResume, onDiscard, onUnit, onMiss }: TodayProps) {
  const today = todayKey()
  const latest = mostRecentSession(store.sessions)
  const recommendedId = draft?.dayId ?? nextDayId(latest?.dayId ?? null)
  const [picked, setPicked] = useState<DayId>(recommendedId)
  const day = getDay(draft?.dayId ?? picked)
  const previous = [...store.sessions]
    .filter((session) => session.dayId === day.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt))[0]
  const [missOpen, setMissOpen] = useState(false)
  const [discardArmed, setDiscardArmed] = useState(false)
  const [missError, setMissError] = useState("")
  const recent = [...store.sessions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt))
    .slice(0, 3)
  const sparse = recent.length === 0 && forecastIds(store.sessions).length === 0

  function saveMiss(reason: string) {
    if (store.sessions.some((session) => session.date === today)) {
      setMissError("Already trained today.")
      return
    }
    onMiss(today, reason)
    setMissOpen(false)
    setMissError("")
  }

  return (
    <div
      className={cx("pt-[max(1.25rem,env(safe-area-inset-top))]", sparse && "flex min-h-[calc(100dvh-var(--nav-h))] flex-col")}
      style={{ background: `radial-gradient(80% 36% at 80% 0%, ${day.accent}33, transparent 62%)` }}
    >
      <header className="flex items-center justify-between">
        <p className="text-sm text-muted">{formatPretty(today)}</p>
        <div className="flex rounded-full bg-white/6 p-1">
          {(["kg", "lb"] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => onUnit(unit)}
              className={cx("h-7 rounded-full px-2.5 text-xs", store.unit === unit ? "bg-ink text-black" : "text-muted")}
            >
              {unit}
            </button>
          ))}
        </div>
      </header>

      <div className={cx("mt-8", sparse && "flex flex-1 flex-col justify-center")}>
      <div className="grid grid-cols-3 gap-2">
        {DAYS.map((item) => {
          const active = item.id === day.id
          return (
            <button
              key={item.id}
              type="button"
              disabled={Boolean(draft)}
              onClick={() => setPicked(item.id)}
              className={cx("h-10 rounded-full text-sm", active ? "text-black" : "bg-white/8 text-muted")}
              style={active ? { background: item.accent } : undefined}
            >
              {item.name}
            </button>
          )
        })}
      </div>

      <h1 className="mt-7 font-display text-[4.75rem] uppercase leading-[0.8] tracking-tight">{day.name}</h1>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
        {day.focus.map((part) => (
          <span key={part.label} className="flex items-center gap-1.5 text-sm text-muted">
            <i className="h-1.5 w-1.5 rounded-full" style={{ background: part.color }} />
            {part.label}
          </span>
        ))}
      </div>

      <div className="mt-8">
        {draft ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onResume}
              className="h-14 rounded-2xl font-display text-2xl uppercase tracking-wide"
              style={{ background: day.accent, color: day.accentText }}
            >
              Resume
            </button>
            {discardArmed ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDiscardArmed(false)} className="h-11 rounded-2xl bg-white/6 text-sm">
                  Keep
                </button>
                <button type="button" onClick={onDiscard} className="h-11 rounded-2xl text-sm text-miss">
                  Discard
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setDiscardArmed(true)} className="h-10 text-sm text-muted">
                Discard
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onStart(day.id, today)}
            className="h-14 w-full rounded-2xl font-display text-2xl uppercase tracking-wide"
            style={{ background: day.accent, color: day.accentText }}
          >
            Start
          </button>
        )}
        {previous ? <p className="mt-3 text-center text-sm text-muted">{headlineFor(previous, store.unit)}</p> : null}
      </div>
      </div>

      <section className={cx(sparse ? "pb-2" : "mt-10")}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs tracking-[0.16em] text-muted uppercase">Week</p>
          <button type="button" onClick={() => setMissOpen((open) => !open)} className="text-xs text-muted">
            {missOpen ? "Close" : "Missed"}
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekKeys(today).map((key, index) => {
            const session = store.sessions.find((item) => item.date === key)
            const miss = store.misses.find((item) => item.date === key)
            const loggedDay = session ? getDay(session.dayId) : null
            return (
              <div key={key} className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-muted">{WEEK_LETTERS[index]}</span>
                <span
                  className={cx("h-8 w-full rounded-full", key === today && "ring-1 ring-white/50", !loggedDay && !miss && "bg-white/8")}
                  style={
                    loggedDay
                      ? { background: loggedDay.accent }
                      : miss
                        ? { background: "#ff6b5a" }
                        : undefined
                  }
                />
              </div>
            )
          })}
        </div>
        {missOpen ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {MISS_REASONS.map((reason) => (
              <button key={reason} type="button" onClick={() => saveMiss(reason)} className="h-9 rounded-full bg-white/6 px-3 text-sm">
                {reason}
              </button>
            ))}
            {missError ? <p className="w-full text-sm text-miss">{missError}</p> : null}
          </div>
        ) : null}
      </section>

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
