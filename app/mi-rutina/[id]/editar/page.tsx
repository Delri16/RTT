"use client"

import { useParams } from "next/navigation"
import { useApp } from "@/app/app-provider"
import RoutineLoader from "@/components/routine/routine-loader"
import RoutineBuilder from "@/components/routine/routine-builder"

export const dynamic = "force-dynamic"

export default function EditRoutinePage() {
  const params = useParams()
  const id = params.id as string
  const { username } = useApp()
  if (!username) return null
  return <RoutineLoader id={id}>{(routine) => <RoutineBuilder username={username} initial={routine} />}</RoutineLoader>
}
