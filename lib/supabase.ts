import { createClient } from "@supabase/supabase-js"

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Persist session in localStorage and auto-refresh access tokens so the user
// stays signed in across reloads / days until they explicitly log out.
const authOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
} as const

// Create client only if we have valid credentials
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, authOptions)
    : createClient("https://placeholder.supabase.co", "placeholder-key", authOptions)

let _supabaseAdmin: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  // Only create admin client on server side
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdmin can only be used on the server side")
  }

  if (!_supabaseAdmin) {
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
    }

    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return _supabaseAdmin
}

export type Profile = {
  username: string
  email?: string
  auth_user_id?: string
  avatar_url?: string
  current_weight?: number
  target_weight?: number
  updated_at: string
}

export type Group = {
  id: string
  name: string
  description?: string
  end_date?: string
  created_by: string
  created_at: string
}

export type GroupMember = {
  group_id: string
  username: string
  is_admin: boolean
  joined_at: string
}

export type GroupActivity = {
  id: string
  group_id: string
  name: string
  points: number
}

export type UserActivity = {
  id: string
  username: string
  group_id: string
  activity_id: string
  points_earned: number
  completed_at: string
}

export type BiWeeklyReport = {
  id: string
  username: string
  group_id: string
  scale_photo_url?: string
  body_photo_url?: string
  reported_weight: number
  report_date: string
}
