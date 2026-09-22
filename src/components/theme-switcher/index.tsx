"use client"

import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import s from "./styles.module.css"

/**
 * The store never changes, so subscription is a no-op. Hoisted so its identity
 * stays stable across renders and React does not resubscribe on every one.
 */
const subscribe = () => () => {}

export function ThemeSwitcher() {
  // false during SSR and the first client render, true once hydrated. The
  // stored theme is unknown until the client takes over, so rendering the
  // toggle earlier would flash the wrong icon — this is the mount guard.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
  const { theme, setTheme } = useTheme()

  if (!mounted) return null

  return (
    <div className={s.themeSwitcher}>
      {theme !== "light" && (
        <button
          className={`${s.themeButton} ${s.lightThemeButton}`}
          onClick={() => setTheme("light")}
          aria-label="Switch to light theme"
        >
          <Sun />
        </button>
      )}
      {theme !== "dark" && (
        <button
          className={`${s.themeButton} ${s.darkThemeButton}`}
          onClick={() => setTheme("dark")}
          aria-label="Switch to dark theme"
        >
          <Moon />
        </button>
      )}
    </div>
  )
}
