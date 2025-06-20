"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div>
      {theme !== "light" && (
        <button
          onClick={() => setTheme("light")}
          aria-label="Switch to light theme"
        >
          <Sun />
        </button>
      )}
      {theme !== "dark" && (
        <button
          onClick={() => setTheme("dark")}
          aria-label="Switch to dark theme"
        >
          <Moon />
        </button>
      )}
    </div>
  )
}
