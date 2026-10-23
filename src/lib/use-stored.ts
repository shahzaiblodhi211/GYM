"use client"

import { useCallback, useSyncExternalStore } from "react"

export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

export function useStoredString(key: string, fallback: string): string {
  const subscribe = useCallback((onChange: () => void) => {
    const handler = () => onChange()
    window.addEventListener("storage", handler)
    window.addEventListener(key, handler)
    return () => {
      window.removeEventListener("storage", handler)
      window.removeEventListener(key, handler)
    }
  }, [key])

  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) ?? fallback
    } catch {
      return fallback
    }
  }, [key, fallback])

  const getServerSnapshot = useCallback(() => fallback, [fallback])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
