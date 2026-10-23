"use client"

import { useRef, useState } from "react"
import { dateKey, formatMonth, formatPretty, monthCells, todayKey, WEEK_LETTERS } from "@/lib/dates"
import { DAYS, getDay, getExercise, MISS_REASONS } from "@/lib/program"
import { formatWeight } from "@/lib/strength"
import { parseStore } from "@/lib/store"
import type { DayId, Draft, Store } from "@/lib/types"
import { cx } from "@/components/ui"

type HistoryProps = {
  store: Store
  draft: Draft | null
  onMiss: (date: string, reason: string) => void
  onDeleteMiss: (id: string) => void
  onDeleteSession: (id: string) => void
  onStart: (dayId: DayId, date: string) => void
  onImport: (store: Store) => void
}

export function HistoryScreen({ store, draft, onMiss, onDeleteMiss, onDeleteSession, onStart, onImport }: HistoryProps) {
  const today = todayKey()
  const initial = new Date()
  const [cursor, setCursor] = useState({ year: initial.getFullYear(), month: initial.getMonth() })
  const [selected, setSelected] = useState(today)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const cells = monthCells(cursor.year, cursor.month)
  const atCurrentMonth = cursor.year === initial.getFullYear() && cursor.month === initial.getMonth()
  const sessions = store.sessions.filter((session) => session.date === selected)
  const miss = store.misses.find((item) => item.date === selected)
  const future = selected > today

  function shiftMonth(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    if (next.getFullYear() > initial.getFullYear() || (next.getFullYear() === initial.getFullYear() && next.getMonth() > initial.getMonth())) return
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `gym-${today}.json`
    link.click()
    URL.revokeObjectURL(url)
    setNotice("Saved")
    setError("")
  }

  function importBackup(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "")
        const data = JSON.parse(text) as { sessions?: unknown }
        if (!data || !Array.isArray(data.sessions)) {
          setError("Not a gym backup")
          setNotice("")
          return
        }
        onImport(parseStore(text))
        setNotice("Restored")
        setError("")
      } catch {
        setError("Not a gym backup")
        setNotice("")
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shiftMonth(-1)} className="h-10 w-10 text-2xl text-muted" aria-label="Previous month">
          ‹
        </button>
        <h1 className="font-display text-3xl uppercase">{formatMonth(cursor.year, cursor.month)}</h1>
        <button type="button" onClick={() => shiftMonth(1)} disabled={atCurrentMonth} className="h-10 w-10 text-2xl text-muted disabled:opacity-25" aria-label="Next month">
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-[10px] text-muted">
        {WEEK_LETTERS.map((letter, index) => (
          <span key={`${letter}-${index}`}>{letter}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-2 text-center">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />
          const key = dateKey(cursor.year, cursor.month, day)
          const logged = store.sessions.find((session) => session.date === key)
          const missed = store.misses.some((item) => item.date === key)
          const tone = logged ? getDay(logged.dayId) : null
          const isSelected = selected === key
          return (
            <button key={key} type="button" onClick={() => setSelected(key)} className="mx-auto flex h-10 w-10 items-center justify-center">
              <span
                className={cx("flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums", isSelected && "ring-1 ring-white", key > today && "text-white/25")}
                style={tone ? { background: tone.accent, color: tone.accentText } : undefined}
              >
                {missed && !tone ? "·" : day}
              </span>
            </button>
          )
        })}
      </div>

      <section className="mt-6 border-t border-white/8 pt-5">
        <h2 className="font-display text-3xl uppercase leading-none">{formatPretty(selected)}</h2>
        {future ? <p className="mt-3 text-sm text-muted">Ahead</p> : null}
        {sessions.map((session) => {
          const day = getDay(session.dayId)
          return (
            <article key={session.id} className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: day.accent }}>
                  {day.name}
                </p>
                <DeleteButton onDelete={() => onDeleteSession(session.id)} />
              </div>
              <ul className="mt-2">
                {session.exercises.map((logged) => {
                  const exercise = getExercise(logged.exerciseId)
                  const top = [...logged.sets].sort((a, b) => b.weightKg - a.weightKg || b.reps - a.reps)[0]
                  return (
                    <li key={logged.exerciseId} className="flex items-center justify-between border-b border-white/6 py-2.5 text-sm">
                      <span>{exercise?.short ?? logged.exerciseId}</span>
                      <span className="tabular-nums text-muted">{top ? `${formatWeight(top.weightKg, store.unit)} × ${top.reps}` : "—"}</span>
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}

        {!future && sessions.length === 0 ? (
          <div className="mt-4">
            {miss ? (
              <button type="button" onClick={() => onDeleteMiss(miss.id)} className="text-sm text-miss">
                Missed · {miss.reason}
              </button>
            ) : draft ? (
              <p className="text-sm text-muted">Finish the open workout first.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {DAYS.map((day) => (
                    <button key={day.id} type="button" onClick={() => onStart(day.id, selected)} className="h-12 rounded-2xl font-display uppercase" style={{ background: day.accent, color: day.accentText }}>
                      {day.name}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MISS_REASONS.map((reason) => (
                    <button key={reason} type="button" onClick={() => onMiss(selected, reason)} className="h-8 rounded-full bg-white/6 px-3 text-xs text-muted">
                      {reason}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </section>

      <div className="mt-10 flex items-center justify-between text-sm text-muted">
        <button type="button" onClick={exportBackup}>
          Download
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Restore
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) importBackup(file)
            event.target.value = ""
          }}
        />
      </div>
      {notice ? <p className="mt-2 text-sm text-pull">{notice}</p> : null}
      {error ? <p className="mt-2 text-sm text-miss">{error}</p> : null}
    </div>
  )
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className="text-xs text-muted">
        Delete
      </button>
    )
  }
  return (
    <span className="flex gap-3 text-xs">
      <button type="button" onClick={() => setArmed(false)} className="text-muted">
        Keep
      </button>
      <button type="button" onClick={onDelete} className="text-miss">
        Delete
      </button>
    </span>
  )
}
