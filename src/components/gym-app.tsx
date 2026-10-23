"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { HistoryScreen } from "@/components/history-screen"
import { ProgressScreen } from "@/components/progress-screen"
import { TodayScreen } from "@/components/today-screen"
import { cx } from "@/components/ui"
import { WorkoutScreen } from "@/components/workout-screen"
import { todayKey } from "@/lib/dates"
import { getDay } from "@/lib/program"
import { addSession, DRAFT_KEY, EMPTY_STORE_RAW, parseDraft, parseStore, STORE_KEY, upsertMiss, writeStored } from "@/lib/store"
import { createDraft } from "@/lib/training"
import type { DayId, Draft, Store } from "@/lib/types"
import { useHydrated, useStoredString } from "@/lib/use-stored"

type Tab = "today" | "train" | "lifts" | "days"

export function GymApp() {
  const hydrated = useHydrated()
  const storeRaw = useStoredString(STORE_KEY, EMPTY_STORE_RAW)
  const draftRaw = useStoredString(DRAFT_KEY, "")
  const store = useMemo(() => parseStore(storeRaw), [storeRaw])
  const draft = useMemo(() => parseDraft(draftRaw), [draftRaw])
  const [tab, setTab] = useState<Tab>("today")

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <div className="text-center">
          <p className="font-display text-5xl uppercase tracking-[0.16em]">Gym</p>
          <p className="mt-2 text-sm tracking-wide text-muted">Push · Pull · Legs</p>
        </div>
      </div>
    )
  }

  function save(next: Store) {
    writeStored(STORE_KEY, JSON.stringify(next))
  }

  function saveDraft(next: Draft | null) {
    writeStored(DRAFT_KEY, next ? JSON.stringify(next) : "")
  }

  function start(dayId: DayId, date = todayKey()) {
    saveDraft(createDraft(dayId, date, store.sessions, store.unit))
    setTab("train")
  }

  const draftDay = draft ? getDay(draft.dayId) : null

  return (
    <div className="min-h-dvh bg-black text-ink">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-x-hidden bg-canvas shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <main className="px-5 pb-[calc(var(--nav-h)+0.25rem)]">
          {tab === "today" ? (
            <TodayScreen
              store={store}
              draft={draft}
              onStart={start}
              onResume={() => setTab("train")}
              onDiscard={() => saveDraft(null)}
              onUnit={(unit) => save({ ...store, unit })}
              onMiss={(date, reason) => save(upsertMiss(store, { id: crypto.randomUUID(), date, reason }))}
            />
          ) : null}
          {tab === "train" ? (
            <WorkoutScreen
              store={store}
              draft={draft}
              onStart={start}
              onDraft={saveDraft}
              onDiscard={() => {
                saveDraft(null)
                setTab("today")
              }}
              onSave={(current) => {
                const exercises = current.exercises
                  .map((exercise) => ({
                    exerciseId: exercise.exerciseId,
                    sets: exercise.sets
                      .filter((set) => set.done && set.weightKg > 0 && set.reps > 0)
                      .map((set) => ({ weightKg: set.weightKg, reps: set.reps })),
                  }))
                  .filter((exercise) => exercise.sets.length > 0)
                if (!exercises.length) return
                save(
                  addSession(store, {
                    id: crypto.randomUUID(),
                    date: current.date,
                    dayId: current.dayId,
                    completedAt: new Date().toISOString(),
                    exercises,
                  }),
                )
                saveDraft(null)
                setTab("today")
              }}
            />
          ) : null}
          {tab === "lifts" ? <ProgressScreen store={store} /> : null}
          {tab === "days" ? (
            <HistoryScreen
              store={store}
              draft={draft}
              onMiss={(date, reason) => save(upsertMiss(store, { id: crypto.randomUUID(), date, reason }))}
              onDeleteMiss={(id) => save({ ...store, misses: store.misses.filter((miss) => miss.id !== id) })}
              onDeleteSession={(id) => save({ ...store, sessions: store.sessions.filter((session) => session.id !== id) })}
              onStart={start}
              onImport={save}
            />
          ) : null}
        </main>
        <nav className="fixed bottom-[max(0.7rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[420px] -translate-x-1/2">
          <div className="grid grid-cols-4 rounded-full border border-white/10 bg-black/80 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <NavButton label="Today" active={tab === "today"} onClick={() => setTab("today")}>
              <HomeIcon />
            </NavButton>
            <NavButton label="Log" active={tab === "train"} onClick={() => setTab("train")} dot={draftDay?.accent}>
              <LogIcon />
            </NavButton>
            <NavButton label="Lifts" active={tab === "lifts"} onClick={() => setTab("lifts")}>
              <LiftIcon />
            </NavButton>
            <NavButton label="Days" active={tab === "days"} onClick={() => setTab("days")}>
              <DaysIcon />
            </NavButton>
          </div>
        </nav>
      </div>
    </div>
  )
}

function NavButton({
  label,
  active,
  onClick,
  children,
  dot,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: ReactNode
  dot?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx("relative flex flex-col items-center gap-0.5 rounded-full py-2 text-[10px]", active ? "bg-white/10 text-ink" : "text-muted")}
    >
      {dot ? <span className="absolute top-1 right-[30%] h-1.5 w-1.5 rounded-full" style={{ background: dot }} /> : null}
      {children}
      {label}
    </button>
  )
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function LogIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9h2.2v6H4v2h4.2v-2H6.2V9H8.2V7H4v2Zm13.8 0H20v2h-2.2v6H20v2h-4.2v-2h2.2V9H15.8V7H20v2h-2.2Z" fill="currentColor" />
      <path d="M8.8 12h6.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function LiftIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 16V8M8 18V6M16 18V6M20 16V8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function DaysIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
