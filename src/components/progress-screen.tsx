"use client"

import { useState } from "react"
import { relativeDay } from "@/lib/dates"
import { DAYS } from "@/lib/program"
import { formatWeight } from "@/lib/strength"
import { performances, suggest } from "@/lib/training"
import type { Store } from "@/lib/types"
import { cx } from "@/components/ui"

export function ProgressScreen({ store }: { store: Store }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="pt-[max(1.25rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-5xl uppercase leading-none">Lifts</h1>
      {DAYS.map((day) => (
        <section key={day.id} className="mt-8">
          <h2 className="text-xs tracking-[0.16em] uppercase" style={{ color: day.accent }}>
            {day.name}
          </h2>
          <ul>
            {day.exercises.map((exercise) => {
              const history = performances(store.sessions, exercise.id)
              const latest = history.at(-1) ?? null
              const suggestion = suggest(exercise, latest, store.unit)
              const open = openId === exercise.id
              const tone = suggestion.mode === "up" ? day.accent : suggestion.mode === "rebuild" ? "#ff8d7a" : undefined
              return (
                <li key={exercise.id} className="border-b border-white/8">
                  <button type="button" onClick={() => setOpenId(open ? null : exercise.id)} className="flex w-full items-center gap-3 py-4 text-left">
                    <span className="h-2 w-2 rounded-full" style={{ background: exercise.muscleColor }} />
                    <span className="flex-1">{exercise.name}</span>
                    {latest ? (
                      <span className="font-display text-3xl leading-none tabular-nums" style={{ color: tone }}>
                        {formatWeight(latest.best.weightKg, store.unit)}
                      </span>
                    ) : null}
                  </button>
                  {open && latest ? (
                    <div className="pb-4 pl-5">
                      <p className="text-sm text-muted">
                        Next {suggestion.weightKg ? formatWeight(suggestion.weightKg, store.unit) : "—"} {store.unit}
                        {suggestion.mode === "up" ? " ↑" : suggestion.mode === "rebuild" ? " ↓" : ""}
                      </p>
                      <Bars points={history.slice(-8)} accent={day.accent} />
                      <ul className="mt-3 flex flex-col gap-1">
                        {[...history].slice(-4).reverse().map((point) => (
                          <li key={`${point.date}-${point.completedAt}`} className="flex justify-between text-sm">
                            <span className="text-muted">{relativeDay(point.date)}</span>
                            <span className="tabular-nums">
                              {formatWeight(point.best.weightKg, store.unit)} × {point.best.reps}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Bars({ points, accent }: { points: { date: string; best: { weightKg: number } }[]; accent: string }) {
  const max = Math.max(...points.map((point) => point.best.weightKg), 1)
  return (
    <div className="mt-4 flex h-16 items-end gap-1.5" aria-hidden="true">
      {points.map((point, index) => (
        <div key={`${point.date}-${index}`} className={cx("flex-1 rounded-t-md")} style={{ height: `${Math.max(18, (point.best.weightKg / max) * 100)}%`, background: accent }} />
      ))}
    </div>
  )
}
