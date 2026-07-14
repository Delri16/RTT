"use client"

import { useParams } from "next/navigation"
import { useApp } from "@/app/app-provider"
import RoutineLoader from "@/components/routine/routine-loader"
import WorkoutSession from "@/components/routine/workout-session"

export const dynamic = "force-dynamic"

export default function TrainRoutinePage() {
  const params = useParams()
  const id = params.id as string
  const { username } = useApp()
  if (!username) return null
  return <RoutineLoader id={id}>{(routine) => <WorkoutSession routine={routine} username={username} />}</RoutineLoader>
}
