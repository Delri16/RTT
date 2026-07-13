"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Sends a push notification to a user about being tagged in an activity
 * This is called from the client side after an activity tag is created
 */
export async function sendActivityTagNotification(params: {
  username: string
  taggedBy: string
  activityName: string
  points: number
  groupName: string
}) {
  console.log("[v0] Sending activity tag notification:", params)

  // This function returns data that the client will use to trigger a local notification
  // In a production app, you would:
  // 1. Store push subscription endpoints in the database
  // 2. Use a service like Firebase Cloud Messaging or Web Push
  // 3. Send the notification from the server to the user's device

  return {
    success: true,
    notification: {
      title: "🐂 Nueva actividad compartida",
      body: `${params.taggedBy} te etiquetó en "${params.activityName}" (${params.points} pts)`,
      type: "activity_tag",
      taggedBy: params.taggedBy,
      activityName: params.activityName,
      points: params.points,
      groupName: params.groupName,
    },
  }
}
