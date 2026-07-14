"use client"

import { useParams } from "next/navigation"
import RoutineLoader from "@/components/routine/routine-loader"
import RoutineDetail from "@/components/routine/routine-detail"

export const dynamic = "force-dynamic"

export default function RoutineDetailPage() {
  const params = useParams()
  const id = params.id as string
  return <RoutineLoader id={id}>{(routine) => <RoutineDetail routine={routine} />}</RoutineLoader>
}
