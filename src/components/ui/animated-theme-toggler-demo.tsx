import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"

export default function ThemeSwitchDemo() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] transition-colors">
      <AnimatedThemeToggler />
    </div>
  )
}
