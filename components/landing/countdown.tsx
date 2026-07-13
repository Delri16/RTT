"use client"

import { useEffect, useState } from "react"

const TARGET_DATE = new Date("2026-07-20T00:01:00-03:00")

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
  done: boolean
}

function getTimeLeft(): TimeLeft {
  const diff = TARGET_DATE.getTime() - Date.now()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: false,
  }
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-toro-foreground text-toro-background rounded-xl px-3 py-2 sm:px-5 sm:py-4 min-w-[64px] sm:min-w-[88px] text-center shadow-lg">
        <span className="text-2xl sm:text-4xl font-display tabular-nums">{String(value).padStart(2, "0")}</span>
      </div>
      <span className="mt-2 text-xs sm:text-sm font-semibold tracking-wide uppercase text-toro-foreground/70">
        {label}
      </span>
    </div>
  )
}

export function Countdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)

  useEffect(() => {
    setTimeLeft(getTimeLeft())
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!timeLeft) {
    return <div className="h-[92px] sm:h-[112px]" />
  }

  if (timeLeft.done) {
    return (
      <p className="text-xl sm:text-2xl font-display text-toro-primary text-center">
        ¡El regreso de los toros ya comenzó! 🐂
      </p>
    )
  }

  return (
    <div className="flex items-start justify-center gap-2 sm:gap-4">
      <Unit value={timeLeft.days} label="Días" />
      <Unit value={timeLeft.hours} label="Horas" />
      <Unit value={timeLeft.minutes} label="Min" />
      <Unit value={timeLeft.seconds} label="Seg" />
    </div>
  )
}
