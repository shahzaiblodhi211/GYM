"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { FORM_CLIPS, type FormClip } from "@/lib/form"
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
  const [pane, setPane] = useState<"clip" | "sets">("clip")
  const [dragX, setDragX] = useState(0)
  const [holdSets, setHoldSets] = useState(false)
  const swipeRef = useRef<{ x: number; y: number; axis: "x" | "y" | null; dx: number } | null>(null)
  const pulling = useRef(false)
  const suppressClick = useRef(false)

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
    const loggedWeight = latest.weightKg
    const sets = liveRef.current.exercises.find((item) => item.exerciseId === exercise.id)?.sets ?? []
    const upcoming = sets.findIndex((set, i) => i > activeSet && !set.done)
    if (upcoming >= 0) {
      updateExercise(exercise.id, (nextSets) =>
        nextSets.map((set, i) => (i === upcoming ? { ...set, weightKg: loggedWeight } : set)),
      )
      setWeightText(null)
      setActiveSet(upcoming)
    } else if (index < day.exercises.length - 1) goTo(index + 1)
  }

  if (!block || !current) return null

  const clip = FORM_CLIPS[exercise.id]

  function showPane(next: "clip" | "sets") {
    if (next === pane && dragX === 0) return
    pulling.current = false
    setDragX(0)
    setHoldSets(next === "clip")
    setPane(next)
  }

  function swipeStart(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (target.closest("button, input, textarea, a, label, [data-noswipe]")) return
    swipeRef.current = { x: event.clientX, y: event.clientY, axis: null, dx: 0 }
  }

  function swipeMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = swipeRef.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (!start.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      start.axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? "x" : "y"
      if (start.axis !== "x") return
      pulling.current = true
      setHoldSets(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (start.axis !== "x") return
    const width = Math.min(window.innerWidth, 480)
    const next = pane === "clip" ? Math.max(-width, Math.min(0, dx)) : Math.max(0, Math.min(width, dx))
    start.dx = next
    setDragX(next)
  }

  function swipeEnd() {
    const start = swipeRef.current
    swipeRef.current = null
    if (!start || start.axis !== "x") return
    pulling.current = false
    if (Math.abs(start.dx) > 12) suppressClick.current = true
    if (pane === "clip" && start.dx < -64) showPane("sets")
    else if (pane === "sets" && start.dx > 64) showPane("clip")
    else {
      setDragX(0)
      if (pane === "sets") setHoldSets(false)
    }
  }

  const exerciseDots = (
    <div className="flex items-center justify-center gap-1.5">
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
            style={{ background: complete || itemIndex === index ? "#d0d0d0" : "rgba(255,255,255,0.22)" }}
          />
        )
      })}
    </div>
  )

  return (
    <div className="touch-pan-y" onPointerDown={swipeStart} onPointerMove={swipeMove} onPointerUp={swipeEnd} onPointerCancel={swipeEnd}>
      <div className="fixed top-[max(0.65rem,env(safe-area-inset-top))] left-1/2 z-30 h-12 w-full max-w-[480px] -translate-x-1/2">
        <div className="flex h-full items-center justify-center">
          <ModePill pane={pane} onChange={showPane} />
        </div>
        {discardArmed ? (
          <button type="button" onClick={onDiscard} className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-miss">
            Discard
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setDiscardArmed(true)}
            className="absolute top-1/2 right-4 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1c1c1e] text-muted"
            aria-label="Discard workout"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <div
        className={cx(
          "fixed inset-x-0 top-0 z-20 mx-auto h-[calc(100dvh-var(--nav-h))] max-w-[480px] touch-pan-y bg-black",
          pane === "sets" && !pulling.current && "pointer-events-none",
        )}
        style={{
          transform: `translateX(calc(${pane === "sets" ? "-100%" : "0px"} + ${dragX}px))`,
          transition: pulling.current ? "none" : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onClickCapture={(event) => {
          if (!suppressClick.current) return
          suppressClick.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
        onTransitionEnd={(event) => {
          if (event.target !== event.currentTarget || event.propertyName !== "transform") return
          if (pane === "clip" && dragX === 0) setHoldSets(false)
        }}
      >
        {clip ? (
          <FormVideo key={exercise.id} clip={clip} label={`${exercise.name} form`} fill active={pane === "clip"} />
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-muted">No clip for this exercise</div>
        )}
        {restLeft !== null ? (
          <span className="absolute top-[max(4.6rem,calc(env(safe-area-inset-top)+3.6rem))] left-4 rounded-full bg-[#1c1c1e] px-2.5 py-1 font-display text-sm">
            {restLeft > 0 ? clock(restLeft) : "Go"}
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex flex-col items-center gap-2">
          <p className="text-sm text-white/70">{exercise.name}</p>
          <div className="pointer-events-auto">{exerciseDots}</div>
        </div>
      </div>

      <div className={cx("touch-pan-y pt-[calc(4.1rem+max(0.65rem,env(safe-area-inset-top)))]", pane === "clip" && !holdSets && "hidden")}>
      <div className="grid grid-cols-[3rem_1fr_3rem] items-center">
        <p className="text-sm text-muted">
          {index + 1}/{day.exercises.length}
        </p>
        {exerciseDots}
        <span />
      </div>

      <div className="mt-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">{exercise.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {exercise.muscle} · {exercise.sets} × {prettyReps(exercise.reps)}
            {lastSet ? ` · last ${formatWeight(lastSet.weightKg, store.unit)}×${lastSet.reps}` : ""}
          </p>
        </div>
        <button type="button" onClick={() => setCueOpen((open) => !open)} className="h-9 w-9 shrink-0 rounded-full bg-[#1c1c1e] text-sm text-muted" aria-label="Form cue">
          i
        </button>
      </div>
      {cueOpen ? <p className="mt-3 text-sm leading-5 text-muted">{exercise.cue}</p> : null}
      {hint ? <p className="mt-3 text-sm text-miss">{hint}</p> : null}

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div>
          <p className="text-center text-xs text-muted">{store.unit}</p>
          <div className="mt-2 flex items-center justify-between">
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
              className="w-16 bg-transparent text-center text-4xl font-medium outline-none placeholder:text-white/20"
            />
            <RoundButton
              label={`Increase ${store.unit}`}
              onClick={() => {
                tap()
                setWeightText(null)
                patchSet((set) => ({ ...set, weightKg: addPlate(set.weightKg, exercise.step, store.unit), done: false }))
              }}
            >
              +
            </RoundButton>
          </div>
        </div>
        <div>
          <p className="text-center text-xs text-muted">reps</p>
          <div className="mt-2 flex items-center justify-between">
            <RoundButton
              label="Decrease reps"
              onClick={() => {
                tap()
                patchSet((set) => ({ ...set, reps: Math.max(0, set.reps - 1), done: false }))
              }}
            >
              −
            </RoundButton>
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
              className="w-12 bg-transparent text-center text-4xl font-medium outline-none placeholder:text-white/20"
            />
            <RoundButton
              label="Increase reps"
              onClick={() => {
                tap()
                patchSet((set) => ({ ...set, reps: Math.min(30, set.reps + 1), done: false }))
              }}
            >
              +
            </RoundButton>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {block.sets.map((set, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={set.done}
            aria-label={`Set ${i + 1}`}
            onClick={() => {
              setWeightText(null)
              setActiveSet(i)
            }}
            className={cx("flex h-12 w-full items-center text-sm", i === activeSet ? "text-ink" : "text-muted")}
          >
            <span className="w-14">Set {i + 1}</span>
            <span className="flex-1 text-center tabular-nums">
              {set.weightKg ? `${formatWeight(set.weightKg, store.unit)} × ${set.reps || "–"}` : "—"}
            </span>
            <span className="w-6 text-right">{set.done ? "✓" : ""}</span>
          </button>
        ))}
      </div>

      {restLeft !== null ? (
        <button type="button" onClick={() => setRestLeft(null)} className="mt-4 block w-full text-left">
          <span className="flex items-center justify-between text-sm">
            <span className="tabular-nums">{restLeft > 0 ? clock(restLeft) : "Go"}</span>
            <span className="text-muted">Skip rest</span>
          </span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#2c2c2e]">
            <span className="block h-full rounded-full bg-[#d0d0d0]" style={{ width: `${(restLeft / 75) * 100}%` }} />
          </span>
        </button>
      ) : null}

      <div className="mt-8 grid grid-cols-[1fr_1.4fr_1fr] gap-2">
        <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)} className="h-12 rounded-full bg-[#1c1c1e] text-sm text-muted disabled:opacity-30">
          Back
        </button>
        <button type="button" onClick={markSet} className="h-12 rounded-full bg-ink text-sm font-medium text-black">
          {current.done ? "Undo" : "Done"}
        </button>
        {confirming ? (
          <button type="button" onClick={() => onSave(liveRef.current)} className="h-12 rounded-full bg-ink text-sm font-medium text-black">
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
            className="h-12 rounded-full bg-[#1c1c1e] text-sm disabled:opacity-30"
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
    </div>
  )
}

function RoundButton({ children, onClick, label }: { children: string; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault()
        onClick()
      }}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1c1c1e] text-xl text-muted"
    >
      {children}
    </button>
  )
}

function FormVideo({ clip, label, fill = false, active = true }: { clip: FormClip; label: string; fill?: boolean; active?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const bounds = useRef(clip)
  const pausedRef = useRef(false)
  const scrubbing = useRef(false)
  const activeRef = useRef(active)
  bounds.current = clip
  activeRef.current = active

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let frame = 0
    let jumping = false
    pausedRef.current = false
    setPaused(false)
    setProgress(0)
    const watch = () => {
      if (!activeRef.current) {
        frame = requestAnimationFrame(watch)
        return
      }
      const { start, end } = bounds.current
      if (
        !jumping &&
        !pausedRef.current &&
        !scrubbing.current &&
        video.readyState >= 1 &&
        video.currentTime >= end &&
        video.currentTime > start
      ) {
        jumping = true
        video.style.visibility = "hidden"
        video.currentTime = start
      }
      frame = requestAnimationFrame(watch)
    }
    const onSeeked = () => {
      jumping = false
      video.style.visibility = "visible"
      if (activeRef.current && !pausedRef.current && !scrubbing.current && video.paused) video.play().catch(() => {})
    }
    video.addEventListener("seeked", onSeeked)
    frame = requestAnimationFrame(watch)
    return () => {
      cancelAnimationFrame(frame)
      video.removeEventListener("seeked", onSeeked)
    }
  }, [clip.src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!active) {
      video.pause()
      return
    }
    if (!pausedRef.current) video.play().catch(() => {})
  }, [active])

  function toggle() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      pausedRef.current = false
      setPaused(false)
      video.play().catch(() => {})
    } else {
      pausedRef.current = true
      setPaused(true)
      video.pause()
    }
  }

  function place(event: ReactPointerEvent<HTMLDivElement>) {
    const video = videoRef.current
    if (!video) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const { start, end } = bounds.current
    video.currentTime = start + ratio * (end - start)
    setProgress(ratio)
  }

  if (failed) {
    return <img src={clip.poster} alt={label} className={fill ? "h-full w-full object-contain" : "mx-auto h-[22rem] w-full object-contain"} />
  }
  return (
    <div className={cx("relative", fill && "h-full")}>
      <video
        ref={videoRef}
        className={fill ? "h-full w-full touch-pan-y object-contain" : "mx-auto h-[22rem] w-full object-contain"}
        src={clip.src}
        poster={clip.poster}
        muted
        playsInline
        autoPlay
        preload="metadata"
        aria-label={label}
        onClick={toggle}
        onError={() => setFailed(true)}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget
          if (clip.start > 0) video.style.visibility = "hidden"
          video.currentTime = clip.start
        }}
        onTimeUpdate={(event) => {
          if (scrubbing.current) return
          const { start, end } = bounds.current
          const span = Math.max(end - start, 0.1)
          setProgress(Math.min(1, Math.max(0, (event.currentTarget.currentTime - start) / span)))
        }}
        onEnded={(event) => {
          const video = event.currentTarget
          video.style.visibility = "hidden"
          video.currentTime = clip.start
        }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={paused ? "Play" : "Pause"}
        className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/70"
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
      <div
        data-noswipe
        className="absolute inset-x-16 bottom-3 flex h-10 items-center"
        style={{ touchAction: "none" }}
        onPointerDown={(event) => {
          scrubbing.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          place(event)
        }}
        onPointerMove={(event) => {
          if (scrubbing.current) place(event)
        }}
        onPointerUp={() => {
          scrubbing.current = false
        }}
        onPointerCancel={() => {
          scrubbing.current = false
        }}
      >
        <div className="relative h-1 w-full rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-white" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  )
}

function ModePill({ pane, onChange }: { pane: "clip" | "sets"; onChange: (pane: "clip" | "sets") => void }) {
  return (
    <div className="relative flex w-fit rounded-full bg-[#1a1a1c] p-1">
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 w-12 rounded-full bg-[#3a3a3c] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: pane === "sets" ? "translateX(100%)" : "translateX(0)" }}
      />
      <button
        type="button"
        aria-label="Clip"
        aria-pressed={pane === "clip"}
        onClick={() => onChange("clip")}
        className={cx("relative z-10 flex h-10 w-12 items-center justify-center", pane === "clip" ? "text-ink" : "text-muted")}
      >
        <VideoIcon />
      </button>
      <button
        type="button"
        aria-label="Sets"
        aria-pressed={pane === "sets"}
        onClick={() => onChange("sets")}
        className={cx("relative z-10 flex h-10 w-12 items-center justify-center", pane === "sets" ? "text-ink" : "text-muted")}
      >
        <SetsIcon />
      </button>
    </div>
  )
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 9.2v5.6l5-2.8z" fill="currentColor" />
    </svg>
  )
}

function SetsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M8 7h11M8 12h11M8 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="4.5" cy="7" r="1.1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" />
      <circle cx="4.5" cy="17" r="1.1" fill="currentColor" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function clock(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
