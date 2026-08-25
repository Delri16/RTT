"use client"

import { useApp } from "@/app/app-provider"
import GlobalRanking from "@/components/ranking/global-ranking"

export const dynamic = "force-dynamic"

export default function RankingPage() {
  const { username } = useApp()
  if (!username) return null
  return <GlobalRanking username={username} />
}
