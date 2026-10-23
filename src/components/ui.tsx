"use client"

import { useState, type PointerEvent } from "react"

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ")
}

export function tap() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(12)
  }
}

export function MuscleLine({ parts }: { parts: { label: string; color: string }[] }) {
  return (
    <p className="text-[13px] font-medium">
      {parts.map((part, index) => (
        <span key={part.label}>
          {index > 0 ? <span className="text-muted"> · </span> : null}
          <span style={{ color: part.color }}>{part.label}</span>
        </span>
      ))}
    </p>
  )
}

type StepperProps = {
  value: string
  onCommit: (raw: string) => void
  onStepDown: () => void
  onStepUp: () => void
  label: string
  inputMode?: "decimal" | "numeric"
  placeholder?: string
}

export function StepperField({
  value,
  onCommit,
  onStepDown,
  onStepUp,
  label,
  inputMode = "decimal",
  placeholder,
}: StepperProps) {
  const [editing, setEditing] = useState<{ base: string; text: string } | null>(null)
  const shown = editing && editing.base === value ? editing.text : value

  function step(action: () => void, event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    setEditing(null)
    action()
  }

  return (
    <div className="min-w-0 rounded-xl border border-line bg-black/50">
      <div className="flex items-center">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className="h-12 w-9 shrink-0 text-xl text-muted"
          onPointerDown={(event) => step(onStepDown, event)}
        >
          −
        </button>
        <input
          inputMode={inputMode}
          enterKeyHint="done"
          aria-label={label}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-center font-display text-[1.65rem] leading-none text-ink outline-none placeholder:text-muted/50"
          value={shown}
          onFocus={(event) => {
            setEditing({ base: value, text: value })
            event.currentTarget.select()
          }}
          onChange={(event) => setEditing({ base: value, text: event.target.value })}
          onBlur={() => {
            if (editing && editing.base === value) onCommit(editing.text)
            setEditing(null)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
          }}
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className="h-12 w-9 shrink-0 text-xl text-muted"
          onPointerDown={(event) => step(onStepUp, event)}
        >
          +
        </button>
      </div>
      <p className="pb-1.5 text-center text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
    </div>
  )
}
