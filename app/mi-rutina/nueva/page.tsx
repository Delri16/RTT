"use client"

import { useApp } from "@/app/app-provider"
import RoutineBuilder from "@/components/routine/routine-builder"

export const dynamic = "force-dynamic"

export default function NuevaRutinaPage() {
  const { username } = useApp()
  if (!username) return null
  return <RoutineBuilder username={username} />
}
