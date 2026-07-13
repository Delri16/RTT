"use client"

import { useApp } from "@/app/app-provider"
import DashboardPage from "./dashboard/page"

export default function HomePage() {
  const { username } = useApp()

  // The logic is now in AppProvider, this page just renders the dashboard content
  // when the user is logged in.
  if (!username) return null

  return <DashboardPage />
}
