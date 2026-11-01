"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"

import type { ThemePref } from "@/domain/types"
import { cn } from "@/lib/utils"

type AnimatedThemeTogglerProps = {
  className?: string
  onThemeChange?: (theme: ThemePref) => void
}

function SunIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
    </svg>
  )
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> }
}

export const AnimatedThemeToggler = ({ className, onThemeChange }: AnimatedThemeTogglerProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [darkMode, setDarkMode] = useState(() =>
    typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark"
  )

  useEffect(() => {
    const syncTheme = () => setDarkMode(document.documentElement.getAttribute("data-theme") === "dark")
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    })
    return () => observer.disconnect()
  }, [])

  const onToggle = useCallback(async () => {
    if (!buttonRef.current) return

    const toggled = !darkMode
    const updateTheme = () => {
      flushSync(() => {
        setDarkMode(toggled)
        if (onThemeChange) onThemeChange(toggled ? "dark" : "light")
        else {
          document.documentElement.setAttribute("data-theme", toggled ? "dark" : "light")
          localStorage.setItem("theme", toggled ? "dark" : "light")
        }
      })
    }

    const startViewTransition = (document as ViewTransitionDocument).startViewTransition
    if (!startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      updateTheme()
      return
    }

    await startViewTransition.call(document, updateTheme).ready

    const { left, top, width, height } = buttonRef.current.getBoundingClientRect()
    const centerX = left + width / 2
    const centerY = top + height / 2
    const maxDistance = Math.hypot(
      Math.max(centerX, window.innerWidth - centerX),
      Math.max(centerY, window.innerHeight - centerY)
    )

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${centerX}px ${centerY}px)`,
          `circle(${maxDistance}px at ${centerX}px ${centerY}px)`,
        ],
      },
      {
        duration: 700,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      } as KeyframeAnimationOptions
    )
  }, [darkMode, onThemeChange])

  return (
    <button
      ref={buttonRef}
      onClick={onToggle}
      aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        className
      )}
      type="button"
    >
      <AnimatePresence mode="wait" initial={false}>
        {darkMode ? (
          <motion.span
            key="sun-icon"
            initial={{ opacity: 0, scale: 0.55, rotate: 25 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.33 }}
            className="text-[var(--ink)]"
          >
            <SunIcon />
          </motion.span>
        ) : (
          <motion.span
            key="moon-icon"
            initial={{ opacity: 0, scale: 0.55, rotate: -25 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.33 }}
            className="text-[var(--ink)]"
          >
            <MoonIcon />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
