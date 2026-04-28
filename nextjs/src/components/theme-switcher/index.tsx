"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import s from "./styles.module.css"

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

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
