"use client"

import { useApp } from "@/app/app-provider"
import DailyGame from "@/components/routine/daily-game"

export const dynamic = "force-dynamic"

export default function DescansoPage() {
  const { username } = useApp()
  if (!username) return null
  return <DailyGame username={username} />
}
