"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "gym.pwa.dismissed"
const DISMISS_EVENT = "gym-pwa-dismiss"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {})
  }, [])

  return null
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function installClosed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1" || isStandalone()
  } catch {
    return true
  }
}

function iosSafari() {
  if (installClosed()) return false
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
}

export function InstallHint() {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia("(display-mode: standalone)")
    media.addEventListener("change", onChange)
    window.addEventListener(DISMISS_EVENT, onChange)
    return () => {
      media.removeEventListener("change", onChange)
      window.removeEventListener(DISMISS_EVENT, onChange)
    }
  }, [])
  const closed = useSyncExternalStore(subscribe, installClosed, () => true)
  const showIos = useSyncExternalStore(subscribe, iosSafari, () => false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (closed) return

    function onPrompt(event: Event) {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [closed])

  if (closed || (!installEvent && !showIos)) return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1")
    setInstallEvent(null)
    window.dispatchEvent(new Event(DISMISS_EVENT))
  }

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    setInstallEvent(null)
    if (choice.outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, "1")
      window.dispatchEvent(new Event(DISMISS_EVENT))
    }
  }

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3">
      <p className="min-w-0 flex-1 text-sm">{installEvent ? "Install Gym" : "Share, then Add to Home Screen"}</p>
      {installEvent ? (
        <button type="button" onClick={install} className="h-8 shrink-0 rounded-full bg-push px-3 text-sm text-[#1a1503]">
          Install
        </button>
      ) : null}
      <button type="button" onClick={dismiss} className="shrink-0 text-sm text-muted" aria-label="Dismiss">
        Close
      </button>
    </div>
  )
}
