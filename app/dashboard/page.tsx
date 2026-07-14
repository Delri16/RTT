"use client"

import { useApp } from "@/app/app-provider"
import HomeFeed from "@/components/feed/home-feed"

export default function DashboardPage() {
  const { username } = useApp()
  if (!username) return null
  return <HomeFeed />
}
