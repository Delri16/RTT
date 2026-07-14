"use client"

import { useApp } from "@/app/app-provider"
import RoutineHub from "@/components/routine/routine-hub"

export const dynamic = "force-dynamic"

export default function MiRutinaPage() {
  const { username } = useApp()
  if (!username) return null
  return <RoutineHub username={username} />
}
