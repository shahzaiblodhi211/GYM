"use client"

import { useEffect, useRef, useState } from "react"
import { DAYS, getDay, prettyReps } from "@/lib/program"
import { addPlate, formatWeight, formatWeightUnit, parseDisplayWeight, subPlate } from "@/lib/strength"
import { doneSetCount, lastPerformance, suggest } from "@/lib/training"
import type { DayId, Draft, SetDraft, Store } from "@/lib/types"
import { cx, tap } from "@/components/ui"

type WorkoutProps = {
  store: Store
  draft: Draft | null
  onStart: (dayId: DayId, date?: string) => void
  onDraft: (draft: Draft) => void
  onDiscard: () => void
  onSave: (draft: Draft) => void
}

export function WorkoutScreen({ store, draft, onStart, onDraft, onDiscard, onSave }: WorkoutProps) {
  if (!draft) return <PickDay onStart={onStart} />
  return <ActiveWorkout store={store} draft={draft} onDraft={onDraft} onDiscard={onDiscard} onSave={onSave} />
}

function PickDay({ onStart }: { onStart: (dayId: DayId, date?: string) => void }) {
  return (
    <div className="flex flex-col gap-3 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-5xl uppercase leading-none">Train</h1>
      {DAYS.map((day) => (
        <button
          key={day.id}
          type="button"
          onClick={() => onStart(day.id)}
          className="flex h-28 items-end justify-between rounded-[1.6rem] px-5 pb-5 text-left"
          style={{ background: `linear-gradient(145deg, ${day.accent} 0%, ${day.accent}88 55%, #141416 100%)`, color: day.accentText }}
        >
          <span className="font-display text-5xl uppercase leading-none">{day.name}</span>
          <span className="mb-1 flex gap-1.5">
            {day.focus.map((part) => (
              <i key={part.label} className="h-2 w-2 rounded-full bg-black/35" />
            ))}
          </span>
        </button>
      ))}
    </div>
  )
}

function ActiveWorkout({
  store,
  draft,
  onDraft,
  onDiscard,
  onSave,
}: {
  store: Store
  draft: Draft
  onDraft: (draft: Draft) => void
  onDiscard: () => void
  onSave: (draft: Draft) => void
}) {
  const [live, setLive] = useState(draft)
  const liveRef = useRef(draft)
  const day = getDay(live.dayId)
  const [index, setIndex] = useState(0)
  const [activeSet, setActiveSet] = useState(0)
  const [cueOpen, setCueOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [discardArmed, setDiscardArmed] = useState(false)
  const [hint, setHint] = useState("")
  const [weightText, setWeightText] = useState<string | null>(null)
  const [restLeft, setRestLeft] = useState<number | null>(null)

  const exercise = day.exercises[index]
  const block = live.exercises.find((item) => item.exerciseId === exercise.id)
  const current = block?.sets[activeSet]
  const history = lastPerformance(store.sessions, exercise.id, live.date)
  const suggestion = suggest(exercise, history, store.unit, live.date)
  const logged = doneSetCount(live)
  const lastSet = history?.best

  function commit(next: Draft) {
    liveRef.current = next
    setLive(next)
    onDraft(next)
  }

  function updateExercise(exerciseId: string, recipe: (sets: SetDraft[]) => SetDraft[]) {
    const source = liveRef.current
    commit({
      ...source,
      exercises: source.exercises.map((item) =>
        item.exerciseId === exerciseId ? { ...item, sets: recipe(item.sets) } : item,
      ),
    })
  }

  function patchSet(recipe: (set: SetDraft) => SetDraft) {
    updateExercise(exercise.id, (sets) => sets.map((set, i) => (i === activeSet ? recipe(set) : set)))
  }

  useEffect(() => {
    if (restLeft === null || restLeft <= 0) return
    const id = window.setTimeout(() => setRestLeft((value) => (value === null ? null : value - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [restLeft])

  useEffect(() => {
    if (restLeft !== 0) return
    if (typeof navigator.vibrate === "function") navigator.vibrate(160)
    const id = window.setTimeout(() => setRestLeft(null), 1200)
    return () => window.clearTimeout(id)
  }, [restLeft])

  function goTo(nextIndex: number) {
    setIndex(nextIndex)
    setActiveSet(0)
    setCueOpen(false)
    setHint("")
    setWeightText(null)
  }

  function markSet() {
    const latest = liveRef.current.exercises.find((item) => item.exerciseId === exercise.id)?.sets[activeSet]
    if (!latest) return
    if (!latest.done && (latest.weightKg <= 0 || latest.reps <= 0)) {
      setHint("Add a weight")
      return
    }
    setHint("")
    tap()
    const nextDone = !latest.done
    updateExercise(exercise.id, (sets) => sets.map((set, i) => (i === activeSet ? { ...set, done: nextDone } : set)))
    if (!nextDone) return
    setRestLeft(75)
    const sets = liveRef.current.exercises.find((item) => item.exerciseId === exercise.id)?.sets ?? []
    const upcoming = sets.findIndex((set, i) => i > activeSet && !set.done)
    if (upcoming >= 0) setActiveSet(upcoming)
    else if (index < day.exercises.length - 1) goTo(index + 1)
  }

  if (!block || !current) return null

  const target =
    suggestion.weightKg > 0
      ? `${suggestion.mode === "up" ? "↑ " : suggestion.mode === "rebuild" ? "↓ " : ""}${formatWeight(suggestion.weightKg, store.unit)}`
      : "Set weight"

  return (
    <div className="pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {index + 1} / {day.exercises.length}
        </p>
        <div className="flex gap-1.5">
          {day.exercises.map((item, itemIndex) => {
            const loggedBlock = live.exercises.find((entry) => entry.exerciseId === item.id)
            const complete = loggedBlock?.sets.every((set) => set.done) ?? false
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.short}
                onClick={() => goTo(itemIndex)}
                className={cx("h-1.5 rounded-full", itemIndex === index ? "w-6" : "w-1.5")}
                style={{ background: complete || itemIndex === index ? day.accent : "rgba(255,255,255,0.16)" }}
              />
            )
          })}
        </div>
        {discardArmed ? (
          <button type="button" onClick={onDiscard} className="text-sm text-miss">
            Discard
          </button>
        ) : (
          <button type="button" onClick={() => setDiscardArmed(true)} className="text-sm text-muted" aria-label="Discard workout">
            Close
          </button>
        )}
      </header>

      <div className="mt-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm" style={{ color: exercise.muscleColor }}>
            {exercise.muscle}
          </p>
          <h1 className="mt-1 font-display text-[2.6rem] uppercase leading-[0.9]">{exercise.name}</h1>
        </div>
        <button type="button" onClick={() => setCueOpen((open) => !open)} className="mt-1 h-9 w-9 shrink-0 rounded-full bg-white/6 text-sm text-muted" aria-label="Form cue">
          i
        </button>
      </div>
      <p className="mt-3 text-sm text-muted">
        {exercise.sets} × {prettyReps(exercise.reps)}
        <span className="mx-2 text-white/20">/</span>
        <span style={{ color: day.accent }}>{target}</span>
        {lastSet ? <span> · last {formatWeight(lastSet.weightKg, store.unit)}×{lastSet.reps}</span> : null}
      </p>
      {cueOpen ? <p className="mt-3 text-sm leading-5 text-muted">{exercise.cue}</p> : null}
      {hint ? <p className="mt-3 text-sm text-miss">{hint}</p> : null}

      <div className="mt-8 flex items-center justify-between">
        <RoundButton
          label={`Decrease ${store.unit}`}
          onClick={() => {
            tap()
            setWeightText(null)
            patchSet((set) => ({ ...set, weightKg: subPlate(set.weightKg, exercise.step, store.unit), done: false }))
          }}
        >
          −
        </RoundButton>
        <label className="text-center">
          <input
            inputMode="decimal"
            aria-label={store.unit}
            value={weightText ?? formatWeight(current.weightKg, store.unit)}
            placeholder="0"
            onFocus={() => setWeightText(formatWeight(current.weightKg, store.unit))}
            onBlur={() => setWeightText(null)}
            onChange={(event) => {
              setWeightText(event.target.value)
              const parsed = parseDisplayWeight(event.target.value, store.unit)
              if (parsed === null) return
              patchSet((set) => ({ ...set, weightKg: parsed, done: set.done && parsed > 0 && set.reps > 0 }))
            }}
            className="w-44 bg-transparent text-center font-display text-8xl leading-none outline-none placeholder:text-white/20"
          />
          <span className="mt-1 block text-xs tracking-[0.18em] text-muted uppercase">{store.unit}</span>
        </label>
        <RoundButton
          label={`Increase ${store.unit}`}
          accent={day.accent}
          accentText={day.accentText}
          onClick={() => {
            tap()
            setWeightText(null)
            patchSet((set) => ({ ...set, weightKg: addPlate(set.weightKg, exercise.step, store.unit), done: false }))
          }}
        >
          +
        </RoundButton>
      </div>

      <div className="mx-auto mt-6 flex w-40 items-center justify-between rounded-full bg-white/6 px-2 py-1">
        <button
          type="button"
          aria-label="Decrease reps"
          className="h-10 w-10 text-xl text-muted"
          onClick={() => {
            tap()
            patchSet((set) => ({ ...set, reps: Math.max(0, set.reps - 1), done: false }))
          }}
        >
          −
        </button>
        <input
          inputMode="numeric"
          aria-label="reps"
          value={current.reps ? String(current.reps) : ""}
          placeholder="0"
          onChange={(event) => {
            const parsed = Number(event.target.value)
            if (!Number.isFinite(parsed)) return
            const reps = Math.max(0, Math.min(30, Math.round(parsed)))
            patchSet((set) => ({ ...set, reps, done: set.done && set.weightKg > 0 && reps > 0 }))
          }}
          className="w-12 bg-transparent text-center font-display text-3xl outline-none"
        />
        <button
          type="button"
          aria-label="Increase reps"
          className="h-10 w-10 text-xl text-muted"
          onClick={() => {
            tap()
            patchSet((set) => ({ ...set, reps: Math.min(30, set.reps + 1), done: false }))
          }}
        >
          +
        </button>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-2">
        {block.sets.map((set, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={set.done}
            aria-label={`Set ${i + 1} done`}
            onClick={() => {
              setWeightText(null)
              setActiveSet(i)
            }}
            className={cx("h-16 rounded-2xl text-center", i === activeSet && "ring-2 ring-white")}
            style={set.done ? { background: day.accent, color: day.accentText } : { background: "rgba(255,255,255,0.06)" }}
          >
            <span className="font-display text-2xl leading-none">{set.weightKg ? formatWeight(set.weightKg, store.unit) : i + 1}</span>
          </button>
        ))}
      </div>

      {restLeft !== null ? (
        <button type="button" onClick={() => setRestLeft(null)} className="mt-6 block w-full text-left">
          <span className="flex items-baseline justify-between">
            <span className="font-display text-3xl leading-none">{restLeft > 0 ? clock(restLeft) : "Go"}</span>
            <span className="text-xs text-muted">Skip rest</span>
          </span>
          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full" style={{ width: `${(restLeft / 75) * 100}%`, background: day.accent }} />
          </span>
        </button>
      ) : null}

      <div className="mt-6 grid grid-cols-[1fr_1.4fr_1fr] gap-2">
        <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)} className="h-14 rounded-2xl bg-white/6 text-sm disabled:opacity-30">
          Back
        </button>
        <button
          type="button"
          onClick={markSet}
          className="h-14 rounded-2xl font-display text-xl uppercase"
          style={{ background: day.accent, color: day.accentText }}
        >
          {current.done ? "Undo" : "Done"}
        </button>
        {confirming ? (
          <button type="button" onClick={() => onSave(liveRef.current)} className="h-14 rounded-2xl bg-ink font-display text-xl uppercase text-black">
            Save
          </button>
        ) : (
          <button
            type="button"
            disabled={index === day.exercises.length - 1 && logged === 0}
            onClick={() => {
              if (index < day.exercises.length - 1) goTo(index + 1)
              else setConfirming(true)
            }}
            className="h-14 rounded-2xl bg-white/6 font-display text-xl uppercase disabled:opacity-30"
          >
            {index < day.exercises.length - 1 ? "Next" : "Save"}
          </button>
        )}
      </div>
      {confirming ? (
        <button type="button" onClick={() => setConfirming(false)} className="mt-3 h-10 w-full text-sm text-muted">
          Not yet
        </button>
      ) : null}
      {suggestion.weightKg > 0 ? (
        <button
          type="button"
          className="mt-4 h-10 w-full text-sm text-muted"
          onClick={() => patchSet((set) => ({ ...set, weightKg: suggestion.weightKg, done: false }))}
        >
          Use {formatWeightUnit(suggestion.weightKg, store.unit)}
        </button>
      ) : null}
    </div>
  )
}

function RoundButton({
  children,
  onClick,
  label,
  accent,
  accentText,
}: {
  children: string
  onClick: () => void
  label: string
  accent?: string
  accentText?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault()
        onClick()
      }}
      className="flex h-16 w-16 items-center justify-center rounded-full text-3xl"
      style={accent ? { background: accent, color: accentText } : { background: "rgba(255,255,255,0.06)" }}
    >
      {children}
    </button>
  )
}

function clock(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
