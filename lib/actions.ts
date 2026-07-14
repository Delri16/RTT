"use server"

import { supabase, getSupabaseAdmin } from "./supabase"
import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { supabaseAnonKey, supabaseUrl } from "./supabase"

export async function createOrGetProfile(username: string) {
  // Check if profile exists
  const { data: existingProfile } = await supabase.from("profiles").select("*").eq("username", username).single()

  if (existingProfile) {
    return { success: true, profile: existingProfile }
  }

  // Create new profile with avatar column
  const { data, error } = await supabase
    .from("profiles")
    .insert([{ username, avatar: "default", avatar_url: "default" }])
    .select()
    .single()

  if (error) {
    console.error("Error creating profile:", error)
    return { success: false, error: error.message }
  }

  return { success: true, profile: data }
}

// Links a Supabase Auth identity (created via email OTP) to a profile by username.
// Handles both brand-new usernames and legacy usernames that never had an email.
// Username lookups are case-insensitive: "Juan" and "juan" are the same account.
//
// Uses the service-role client: `profiles` has RLS policies (profiles_insert_own /
// profiles_update_own) written against an `auth.uid() = id` check that doesn't match
// this table's actual shape (PK is `username`, not `id`) — those look like leftovers
// from an earlier, unfinished attempt at wiring Supabase Auth directly to this table.
// Rather than touch policies we can't fully audit, this write goes through admin.
export async function linkProfileToAuthUser(username: string, email: string, authUserId: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const admin = getSupabaseAdmin()

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .maybeSingle()

  if (existingProfile) {
    if (existingProfile.email && existingProfile.email.toLowerCase() !== normalizedEmail) {
      return { success: false, error: "Ese nombre de usuario ya está registrado con otro email." }
    }
    if (existingProfile.auth_user_id && existingProfile.auth_user_id !== authUserId) {
      return { success: false, error: "Ese nombre de usuario ya está vinculado a otra cuenta." }
    }

    // Use the canonical (originally stored) username, not whatever casing was typed
    // this time, so it keeps matching existing rows in groups/actividades/etc.
    const { data, error } = await admin
      .from("profiles")
      .update({ email: normalizedEmail, auth_user_id: authUserId })
      .eq("username", existingProfile.username)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, profile: data }
  }

  const { data: emailOwner } = await admin
    .from("profiles")
    .select("username")
    .ilike("email", normalizedEmail)
    .maybeSingle()

  if (emailOwner) {
    return { success: false, error: "Ese email ya está en uso por otro usuario." }
  }

  const { data, error } = await admin
    .from("profiles")
    .insert([{ username, email: normalizedEmail, auth_user_id: authUserId, avatar: "default", avatar_url: "default" }])
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, profile: data }
}

export async function getProfileByAuthUserId(authUserId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("auth_user_id", authUserId).maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: "No hay perfil vinculado a esta cuenta" }
  return { success: true, profile: data }
}

// Legacy username-only lookup, used to detect accounts that predate email login
// so we can ask them for an email once instead of creating a duplicate profile.
// Case-insensitive: "Juan" and "juan" resolve to the same profile.
export async function findProfileByUsername(username: string) {
  const { data, error } = await supabase.from("profiles").select("*").ilike("username", username).maybeSingle()

  if (error) return { success: false, error: error.message }
  return { success: true, profile: data }
}

export async function loginWithPassword(username: string, password?: string) {
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("username", username).single()

  if (error) {
    return { success: false, error: "Usuario no encontrado" }
  }

  // If user has a password set, verify it
  if (profile.password && profile.password !== password) {
    return { success: false, error: "Contraseña incorrecta" }
  }

  return { success: true, profile, hasPassword: !!profile.password }
}

export async function updateProfile(
  username: string,
  updates: {
    avatar?: string
    avatar_url?: string
    current_weight?: number
    target_weight?: number
    password?: string
  },
) {
  // Ensure both avatar columns are updated for compatibility
  if (updates.avatar) {
    updates.avatar_url = updates.avatar
  }
  if (updates.avatar_url && !updates.avatar) {
    updates.avatar = updates.avatar_url
  }

  const { data, error } = await supabase.from("profiles").update(updates).eq("username", username).select().single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/profile")
  return { success: true, profile: data }
}

export async function getUserProfile(username: string) {
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("username", username).single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, profile }
}

export async function updateUserProfile(username: string, updates: any) {
  // Handle avatar updates for both columns
  if (updates.avatar) {
    updates.avatar_url = updates.avatar
  }

  const { data, error } = await supabase.from("profiles").update(updates).eq("username", username).select().single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/profile")
  return { success: true, profile: data }
}

export async function createGroup(formData: FormData) {
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const end_date = formData.get("end_date") as string
  const is_public = formData.get("is_public") === "true"
  const created_by = formData.get("created_by") as string

  // Ensure the user profile exists
  const profileResult = await createOrGetProfile(created_by)
  if (!profileResult.success) {
    return { success: false, error: "Error al verificar el perfil del usuario" }
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert([{ name, description, end_date: end_date || null, created_by, is_public }])
    .select()
    .single()

  if (groupError) {
    console.error("Error creating group:", groupError)
    return { success: false, error: groupError.message }
  }

  // Add creator as admin member
  const { error: memberError } = await supabase
    .from("group_members")
    .insert([{ group_id: group.id, username: created_by, is_admin: true }])

  if (memberError) {
    console.error("Error adding group member:", memberError)
    return { success: false, error: memberError.message }
  }

  revalidatePath("/groups")
  revalidatePath("/discover")
  return { success: true, group }
}

export async function updateGroup(groupId: string, formData: FormData) {
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const end_date = formData.get("end_date") as string
  const is_public = formData.get("is_public") === "true"

  const { data, error } = await supabase
    .from("groups")
    .update({
      name,
      description,
      end_date: end_date || null,
      is_public,
    })
    .eq("id", groupId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
  revalidatePath("/discover")
  return { success: true, group: data }
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from("groups").delete().eq("id", groupId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/groups")
  revalidatePath("/discover")
  return { success: true }
}

export async function removeGroupMember(groupId: string, username: string) {
  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("username", username)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/groups/${groupId}`)
  return { success: true }
}

export async function promoteToAdmin(groupId: string, username: string) {
  const { error } = await supabase
    .from("group_members")
    .update({ is_admin: true })
    .eq("group_id", groupId)
    .eq("username", username)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/groups/${groupId}`)
  return { success: true }
}

export async function joinGroup(groupId: string, username: string) {
  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .eq("username", username)
    .single()

  if (existingMember) {
    return { success: false, error: "Ya eres miembro de este grupo" }
  }

  const { data, error } = await supabase
    .from("group_members")
    .insert([{ group_id: groupId, username, is_admin: false }])
    .select()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/groups")
  revalidatePath("/discover")
  return { success: true, data }
}

export async function joinGroupByInviteCode(inviteCode: string, username: string) {
  // Find group by invite code
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("invite_code", inviteCode.toUpperCase())
    .single()

  if (groupError || !group) {
    return { success: false, error: "Código de invitación inválido" }
  }

  // Join the group
  const result = await joinGroup(group.id, username)
  return result
}

export async function leaveGroup(groupId: string, username: string) {
  // Check if user is the creator
  const { data: group } = await supabase.from("groups").select("created_by").eq("id", groupId).single()

  if (group?.created_by === username) {
    return { success: false, error: "El creador del grupo no puede abandonarlo" }
  }

  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("username", username)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/groups")
  return { success: true }
}

export async function getPublicGroups(username?: string) {
  const query = supabase
    .from("groups")
    .select(`
      *,
      group_members!inner(count)
    `)
    .eq("is_public", true)
    .order("created_at", { ascending: false })

  const { data: groups, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  // Get user's groups to mark which ones they're already in
  let userGroups: string[] = []
  if (username) {
    const { data: userGroupData } = await supabase.from("group_members").select("group_id").eq("username", username)

    userGroups = userGroupData?.map((g) => g.group_id) || []
  }

  // Get member counts for each group
  const groupsWithStats = await Promise.all(
    groups.map(async (group) => {
      const { data: memberCount } = await supabase
        .from("group_members")
        .select("username", { count: "exact" })
        .eq("group_id", group.id)

      return {
        ...group,
        member_count: memberCount?.length || 0,
        is_member: userGroups.includes(group.id),
      }
    }),
  )

  return { success: true, groups: groupsWithStats }
}

export async function createGroupActivity(formData: FormData) {
  const group_id = formData.get("group_id") as string
  const name = formData.get("name") as string
  const activity_type = formData.get("activity_type") as string
  const relation_id = formData.get("relation_id") as string

  let activityData: any = {
    group_id,
    name,
    activity_type: activity_type || "fixed",
    relation_id: relation_id ? Number.parseInt(relation_id) : null,
  }

  if (activity_type === "per_minute") {
    const points_per_minute = Number.parseFloat(formData.get("points_per_minute") as string)
    const min_minutes = Number.parseInt(formData.get("min_minutes") as string)
    const max_minutes = Number.parseInt(formData.get("max_minutes") as string)

    // Validation
    if (!points_per_minute || points_per_minute <= 0) {
      return { success: false, error: "Los puntos por minuto deben ser mayor a 0" }
    }
    if (!min_minutes || min_minutes <= 0) {
      return { success: false, error: "El mínimo de minutos debe ser mayor a 0" }
    }
    if (!max_minutes || max_minutes <= min_minutes) {
      return { success: false, error: "El máximo de minutos debe ser mayor al mínimo" }
    }

    activityData = {
      ...activityData,
      points_per_minute,
      min_minutes,
      max_minutes,
      points: 0, // Set default points for compatibility
    }
  } else {
    const points = Number.parseInt(formData.get("points") as string)
    if (!points || points <= 0) {
      return { success: false, error: "Los puntos deben ser mayor a 0" }
    }
    activityData.points = points
  }

  const { data, error } = await supabase.from("group_activities").insert([activityData]).select().single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/groups/${group_id}`)
  return { success: true, activity: data }
}

export async function updateGroupActivity(activityId: string, formData: FormData) {
  const name = formData.get("name") as string
  const activity_type = formData.get("activity_type") as string
  const relation_id = formData.get("relation_id") as string

  let updateData: any = {
    name,
    activity_type: activity_type || "fixed",
    relation_id: relation_id ? Number.parseInt(relation_id) : null,
  }

  if (activity_type === "per_minute") {
    const points_per_minute = Number.parseFloat(formData.get("points_per_minute") as string)
    const min_minutes = Number.parseInt(formData.get("min_minutes") as string)
    const max_minutes = Number.parseInt(formData.get("max_minutes") as string)

    // Validation
    if (!points_per_minute || points_per_minute <= 0) {
      return { success: false, error: "Los puntos por minuto deben ser mayor a 0" }
    }
    if (!min_minutes || min_minutes <= 0) {
      return { success: false, error: "El mínimo de minutos debe ser mayor a 0" }
    }
    if (!max_minutes || max_minutes <= min_minutes) {
      return { success: false, error: "El máximo de minutos debe ser mayor al mínimo" }
    }

    updateData = {
      ...updateData,
      points_per_minute,
      min_minutes,
      max_minutes,
      points: 0, // Reset points for per_minute activities
    }
  } else {
    const points = Number.parseInt(formData.get("points") as string)
    if (!points || points <= 0) {
      return { success: false, error: "Los puntos deben ser mayor a 0" }
    }
    updateData = {
      ...updateData,
      points,
      points_per_minute: null,
      min_minutes: null,
      max_minutes: null,
    }
  }

  const { data, error } = await supabase
    .from("group_activities")
    .update(updateData)
    .eq("id", activityId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Get group_id to revalidate the correct path
  const { data: activity } = await supabase.from("group_activities").select("group_id").eq("id", activityId).single()

  if (activity) {
    revalidatePath(`/groups/${activity.group_id}`)
  }

  return { success: true, activity: data }
}

export async function deleteGroupActivity(activityId: string) {
  // Get group_id before deleting for revalidation
  const { data: activity } = await supabase.from("group_activities").select("group_id").eq("id", activityId).single()

  // Check if there are any user activities linked to this activity
  const { data: userActivities } = await supabase.from("user_activities").select("id").eq("activity_id", activityId)

  if (userActivities && userActivities.length > 0) {
    return {
      success: false,
      error:
        "No se puede eliminar esta actividad porque ya tiene registros de usuarios. Considera editarla en su lugar.",
    }
  }

  const { error } = await supabase.from("group_activities").delete().eq("id", activityId)

  if (error) {
    return { success: false, error: error.message }
  }

  if (activity) {
    revalidatePath(`/groups/${activity.group_id}`)
  }

  return { success: true }
}

export async function logActivity(formData: FormData) {
  const username = formData.get("username") as string
  const group_id = formData.get("group_id") as string
  const activity_id = formData.get("activity_id") as string
  const minutes_performed = formData.get("minutes_performed")
    ? Number.parseInt(formData.get("minutes_performed") as string)
    : null
  const taggedMembersJson = formData.get("tagged_members") as string | null
  const taggedMembers = taggedMembersJson ? JSON.parse(taggedMembersJson) : []

  console.log("[v0] ===== LOG ACTIVITY START =====")
  console.log("[v0] Username:", username)
  console.log("[v0] Group ID:", group_id)
  console.log("[v0] Activity ID:", activity_id)
  console.log("[v0] Tagged members:", taggedMembers)
  console.log("[v0] Tagged members count:", taggedMembers.length)

  // Get activity details
  const { data: activity, error } = await supabase.from("group_activities").select("*").eq("id", activity_id).single()

  if (error) {
    return { success: false, error: error.message }
  }

  if (!activity) {
    return { success: false, error: "Activity not found" }
  }

  let points_earned = activity.points

  // Calculate points for per_minute activities
  if (activity.activity_type === "per_minute" && minutes_performed) {
    if (minutes_performed < activity.min_minutes || minutes_performed > activity.max_minutes) {
      return {
        success: false,
        error: `Los minutos deben estar entre ${activity.min_minutes} y ${activity.max_minutes}`,
      }
    }

    // Calculate points and round down (remove decimals)
    points_earned = Math.floor(minutes_performed * activity.points_per_minute)
  }

  const rankingData = await getOptimisticRankingPosition(username, group_id, points_earned)
  console.log("[v0] Optimistic ranking calculated:", rankingData)

  // If activity has a relation, log it in all user's groups with the same relation
  if (activity.relation_id) {
    const result = await logRelatedActivity(username, activity, points_earned, minutes_performed, taggedMembers)

    revalidatePath("/")
    revalidatePath("/log")
    revalidatePath("/activities/history")

    return {
      ...result,
      ranking: rankingData,
    }
  }

  // Regular single-group activity
  const { data: userActivityData, error: userActivityError } = await supabase
    .from("user_activities")
    .insert([
      {
        username,
        group_id,
        activity_id,
        points_earned,
        minutes_performed,
      },
    ])
    .select()
    .single()

  console.log("[v0] User activity insert result:")
  console.log("[v0] - Data:", userActivityData)
  console.log("[v0] - Error:", userActivityError)
  console.log("[v0] - Data exists:", !!userActivityData)
  console.log("[v0] - Tagged members length:", taggedMembers.length)

  if (userActivityError) {
    return { success: false, error: userActivityError.message }
  }

  if (!userActivityData) {
    console.error("[v0] No user activity data returned from insert")
    return { success: false, error: "Failed to create user activity" }
  }

  if (taggedMembers.length > 0) {
    try {
      console.log("[v0] ===== CREATING ACTIVITY TAGS =====")
      console.log("[v0] User activity ID:", userActivityData.id)
      console.log("[v0] Tagged by:", username)
      console.log("[v0] Tagged users:", taggedMembers)
      console.log("[v0] Group ID:", group_id)

      const { data: rpcData, error: tagsError } = await supabase.rpc("create_activity_tags", {
        p_activity_id: userActivityData.id,
        p_group_id: group_id,
        p_tagged_by: username,
        p_tagged_users: taggedMembers,
      })

      console.log("[v0] RPC call completed")
      console.log("[v0] RPC result:", rpcData)
      console.log("[v0] RPC error:", tagsError)

      if (tagsError) {
        console.error("[v0] Error creating activity tags:", tagsError.message)
      }
    } catch (err) {
      console.error("[v0] Exception creating activity tags:", err)
    }
  }

  revalidatePath("/")
  revalidatePath("/log")
  revalidatePath("/activities/history")

  return {
    success: true,
    message: "Actividad registrada en 1 grupo(s)",
    ranking: rankingData,
  }
}

async function logRelatedActivity(
  username: string,
  sourceActivity: any,
  points_earned: number,
  minutes_performed: number | null,
  taggedMembers: string[], // Added taggedMembers parameter
) {
  // Get all user's groups that have activities with the same relation
  const { data: userGroups, error: userGroupsError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("username", username)

  if (userGroupsError || !userGroups || userGroups.length === 0) {
    return { success: false, error: userGroupsError?.message || "No groups found for user" }
  }

  const groupIds = userGroups.map((g) => g.group_id)

  // Find all activities in user's groups with the same relation
  const { data: relatedActivities, error: relatedActivitiesError } = await supabase
    .from("group_activities")
    .select("*")
    .eq("relation_id", sourceActivity.relation_id)
    .in("group_id", groupIds)

  if (relatedActivitiesError || !relatedActivities || relatedActivities.length === 0) {
    return { success: false, error: relatedActivitiesError?.message || "No related activities found" }
  }

  // Log activity in each group with related activities
  const insertPromises = relatedActivities.map(async (relatedActivity) => {
    let activityPoints = relatedActivity.points

    // Recalculate points for per_minute activities based on the target activity's configuration
    if (relatedActivity.activity_type === "per_minute" && minutes_performed) {
      // Validate minutes against target activity limits
      if (minutes_performed < relatedActivity.min_minutes || minutes_performed > relatedActivity.max_minutes) {
        // Skip this activity if minutes don't fit the range
        return null
      }
      activityPoints = Math.floor(minutes_performed * relatedActivity.points_per_minute)
    }

    // Insert user activity
    const { data: userActivityData, error: userActivityError } = await supabase
      .from("user_activities")
      .insert([
        {
          username,
          group_id: relatedActivity.group_id,
          activity_id: relatedActivity.id,
          points_earned: activityPoints,
          minutes_performed,
        },
      ])
      .select()
      .single()

    if (userActivityError) {
      console.error(
        `[v0] Error inserting user activity for related group ${relatedActivity.group_id}:`,
        userActivityError,
      )
      return null // Continue with other groups
    }

    // Create activity tags if tagged members exist
    if (taggedMembers.length > 0 && userActivityData) {
      try {
        console.log("[v0] ===== CREATING ACTIVITY TAGS FOR RELATED ACTIVITY =====")
        console.log("[v0] User activity ID:", userActivityData.id)
        console.log("[v0] Tagged by:", username)
        console.log("[v0] Tagged users:", taggedMembers)
        console.log("[v0] Group ID:", relatedActivity.group_id)

        const { error: tagsError } = await supabase.rpc("create_activity_tags", {
          p_activity_id: userActivityData.id,
          p_group_id: relatedActivity.group_id,
          p_tagged_by: username,
          p_tagged_users: taggedMembers,
        })

        if (tagsError) {
          console.error("[v0] Error creating activity tags for related activity:", tagsError.message)
        }
      } catch (err) {
        console.error("[v0] Exception creating activity tags for related activity:", err)
      }
    }

    return userActivityData
  })

  try {
    const results = await Promise.all(insertPromises)
    const successfulInserts = results.filter((result) => result !== null)

    if (successfulInserts.length === 0) {
      return { success: false, error: "No activities could be logged" }
    }

    // Check for achievements in all affected groups
    const achievementPromises = relatedActivities.map(async (activity) => {
      try {
        const { checkAndAwardAchievements } = await import("./achievements")
        return await checkAndAwardAchievements(username, activity.group_id)
      } catch (error) {
        console.error("Error checking achievements:", error)
        return []
      }
    })

    await Promise.all(achievementPromises)

    revalidatePath("/")
    revalidatePath("/log")
    revalidatePath("/activities/history")

    // Return data from the first successful insert for consistency
    return {
      success: true,
      data: successfulInserts[0],
      relatedCount: successfulInserts.length,
      message: `Actividad registrada en ${successfulInserts.length} grupo(s)`,
    }
  } catch (error) {
    console.error("Error logging related activities:", error)
    return { success: false, error: "Error al registrar actividades relacionadas" }
  }
}

export async function uploadPhoto(file: File, bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)

  return { success: true, url: publicUrl }
}

// Lighter report creation: photos are already uploaded to storage client-side
// (see lib/upload.ts), so this only inserts the row + side effects. Avoids
// streaming the photo bytes through the server action.
export async function createReport(input: {
  username: string
  group_id: string
  reported_weight: number
  scale_photo_url?: string
  body_photo_url?: string
}) {
  const { data, error } = await supabase
    .from("bi_weekly_reports")
    .insert([
      {
        username: input.username,
        group_id: input.group_id,
        reported_weight: input.reported_weight,
        scale_photo_url: input.scale_photo_url || "",
        body_photo_url: input.body_photo_url || "",
        report_date: new Date().toISOString().split("T")[0],
      },
    ])
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  if (data) {
    try {
      const { checkAndAwardAchievements } = await import("./achievements")
      await checkAndAwardAchievements(input.username, input.group_id)
    } catch (err) {
      console.error("Error checking achievements:", err)
    }
  }

  await supabase.from("profiles").update({ current_weight: input.reported_weight }).eq("username", input.username)

  revalidatePath("/reports")
  revalidatePath("/")
  return { success: true, report: data }
}

export async function createBiWeeklyReport(formData: FormData) {
  const username = formData.get("username") as string
  const group_id = formData.get("group_id") as string
  const reported_weight = Number.parseFloat(formData.get("reported_weight") as string)
  const scale_photo = formData.get("scale_photo") as File
  const body_photo = formData.get("body_photo") as File

  let scale_photo_url = ""
  let body_photo_url = ""

  // Upload scale photo
  if (scale_photo && scale_photo.size > 0) {
    const scalePath = `${group_id}/${username}/scale_${Date.now()}.jpg`
    const scaleResult = await uploadPhoto(scale_photo, "report_photos", scalePath)
    if (scaleResult.success) {
      scale_photo_url = scaleResult.url
    }
  }

  // Upload body photo
  if (body_photo && body_photo.size > 0) {
    const bodyPath = `${group_id}/${username}/body_${Date.now()}.jpg`
    const bodyResult = await uploadPhoto(body_photo, "report_photos", bodyPath)
    if (bodyResult.success) {
      body_photo_url = bodyResult.url
    }
  }

  const { data, error } = await supabase
    .from("bi_weekly_reports")
    .insert([
      {
        username,
        group_id,
        reported_weight,
        scale_photo_url,
        body_photo_url,
        report_date: new Date().toISOString().split("T")[0],
      },
    ])
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Check for new achievements after creating report
  if (data) {
    try {
      const { checkAndAwardAchievements } = await import("./achievements")
      await checkAndAwardAchievements(username, group_id)
    } catch (error) {
      console.error("Error checking achievements:", error)
    }
  }

  // Update profile weight
  await supabase.from("profiles").update({ current_weight: reported_weight }).eq("username", username)

  revalidatePath("/reports")
  revalidatePath("/")
  return { success: true, report: data }
}

export async function getUserGroups(username: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select(`
      *,
      groups (*)
    `)
    .eq("username", username)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, groups: data }
}

export async function getGroupDetails(groupId: string) {
  const { data: group, error: groupError } = await supabase.from("groups").select("*").eq("id", groupId).single()

  if (groupError) {
    return { success: false, error: groupError.message }
  }

  const { data: members } = await supabase
    .from("group_members")
    .select(`
      *,
      profiles (username, avatar, avatar_url)
    `)
    .eq("group_id", groupId)

  const { data: activities } = await supabase
    .from("group_activities")
    .select(`
      *,
      activity_relations (name, icon)
    `)
    .eq("group_id", groupId)

  return { success: true, group, members: members || [], activities: activities || [] }
}

export async function getUserReportStatus(username: string) {
  const { data: groups } = await supabase
    .from("group_members")
    .select("group_id, groups(name)")
    .eq("username", username)

  if (!groups) return []

  const reportStatus = await Promise.all(
    groups.map(async (groupMember: any) => {
      const { data: lastReport } = await supabase
        .from("bi_weekly_reports")
        .select("report_date")
        .eq("username", username)
        .eq("group_id", groupMember.group_id)
        .order("report_date", { ascending: false })
        .limit(1)
        .single()

      const daysSinceReport = lastReport
        ? Math.floor((new Date().getTime() - new Date(lastReport.report_date).getTime()) / (1000 * 60 * 60 * 24))
        : null

      const needsReport = !lastReport || daysSinceReport >= 15
      const daysUntilNext = lastReport && daysSinceReport < 15 ? 15 - daysSinceReport : 0

      return {
        group_id: groupMember.group_id,
        group_name: groupMember.groups.name,
        needs_report: needsReport,
        days_until_next: daysUntilNext,
        last_report_date: lastReport?.report_date,
      }
    }),
  )

  return reportStatus
}

export async function getGroupReports(groupId: string) {
  const { data: reports, error } = await supabase
    .from("bi_weekly_reports")
    .select("*")
    .eq("group_id", groupId)
    .order("report_date", { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, reports: reports || [] }
}

export async function getUserReports(username: string, groupId?: string) {
  let query = supabase
    .from("bi_weekly_reports")
    .select(`
      *,
      groups (name)
    `)
    .eq("username", username)
    .order("report_date", { ascending: false })

  if (groupId) {
    query = query.eq("group_id", groupId)
  }

  const { data: reports, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, reports: reports || [] }
}

export async function getWeeklyPoints(username: string) {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  // Get all user activities from the last week
  const { data, error } = await supabase
    .from("user_activities")
    .select(`
      points_earned,
      group_activities!inner (relation_id)
    `)
    .eq("username", username)
    .gte("completed_at", oneWeekAgo.toISOString())

  if (error) {
    return 0
  }

  // Group activities by relation_id and keep only the highest points for each relation
  const relationPoints: { [key: string]: number } = {}
  const unrelatedPoints: number[] = []

  data.forEach((activity) => {
    const relationId = activity.group_activities.relation_id

    if (relationId) {
      // For related activities, keep only the highest points
      const key = relationId.toString()
      relationPoints[key] = Math.max(relationPoints[key] || 0, activity.points_earned)
    } else {
      // For unrelated activities, sum all points
      unrelatedPoints.push(activity.points_earned)
    }
  })

  // Sum the highest points from each relation plus all unrelated points
  const totalRelatedPoints = Object.values(relationPoints).reduce((sum, points) => sum + points, 0)
  const totalUnrelatedPoints = unrelatedPoints.reduce((sum, points) => sum + points, 0)

  return totalRelatedPoints + totalUnrelatedPoints
}

export async function getRecentActivities(username: string) {
  const { data, error } = await supabase
    .from("user_activities")
    .select(`
      *,
      group_activities (name, relation_id, activity_relations (name)),
      groups (name)
    `)
    .eq("username", username)
    .order("completed_at", { ascending: false })
    .limit(5)

  if (error) {
    return []
  }

  return data
}

// Unified social feed: activities + reports from every group the user belongs to,
// newest first, keyset-paginated by timestamp. This powers the Instagram-style home.
export type FeedItem =
  | {
      type: "activity"
      id: string
      username: string
      ts: string
      groupName: string | null
      avatar: string | null
      activityName: string | null
      points: number
      minutes: number | null
    }
  | {
      type: "report"
      id: string
      username: string
      ts: string
      groupName: string | null
      avatar: string | null
      weight: number
      scalePhotoUrl: string | null
      bodyPhotoUrl: string | null
    }

export async function getGroupFeed(
  username: string,
  opts?: { limit?: number; before?: string },
): Promise<{ success: boolean; items: FeedItem[]; nextCursor: string | null; error?: string }> {
  const limit = opts?.limit ?? 20
  const before = opts?.before

  const { data: memberships, error: mErr } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("username", username)

  if (mErr) return { success: false, items: [], nextCursor: null, error: mErr.message }

  const groupIds = (memberships ?? []).map((m) => m.group_id)
  if (groupIds.length === 0) return { success: true, items: [], nextCursor: null }

  // Over-fetch by one from each source so we can tell if there's a next page.
  let actQ = supabase
    .from("user_activities")
    .select("id, username, group_id, points_earned, minutes_performed, completed_at, group_activities (name), groups (name)")
    .in("group_id", groupIds)
    .order("completed_at", { ascending: false })
    .limit(limit + 1)
  if (before) actQ = actQ.lt("completed_at", before)

  let repQ = supabase
    .from("bi_weekly_reports")
    .select("id, username, group_id, reported_weight, scale_photo_url, body_photo_url, created_at, groups (name)")
    .in("group_id", groupIds)
    .order("created_at", { ascending: false })
    .limit(limit + 1)
  if (before) repQ = repQ.lt("created_at", before)

  const [{ data: acts }, { data: reps }] = await Promise.all([actQ, repQ])

  const merged: FeedItem[] = [
    ...((acts ?? []).map((a: any) => ({
      type: "activity" as const,
      id: a.id,
      username: a.username,
      ts: a.completed_at,
      groupName: a.groups?.name ?? null,
      avatar: null,
      activityName: a.group_activities?.name ?? null,
      points: a.points_earned,
      minutes: a.minutes_performed ?? null,
    }))),
    ...((reps ?? []).map((r: any) => ({
      type: "report" as const,
      id: r.id,
      username: r.username,
      ts: r.created_at,
      groupName: r.groups?.name ?? null,
      avatar: null,
      weight: r.reported_weight,
      scalePhotoUrl: r.scale_photo_url || null,
      bodyPhotoUrl: r.body_photo_url || null,
    }))),
  ].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))

  const page = merged.slice(0, limit)
  const nextCursor = merged.length > limit ? page[page.length - 1]?.ts ?? null : null

  // Attach author avatars in one query.
  const usernames = [...new Set(page.map((i) => i.username))]
  if (usernames.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("username, avatar, avatar_url").in("username", usernames)
    const avatarMap = new Map((profiles ?? []).map((p: any) => [p.username, p.avatar || p.avatar_url || null]))
    for (const item of page) item.avatar = avatarMap.get(item.username) ?? null
  }

  return { success: true, items: page, nextCursor }
}

export async function getAllUserActivities(username: string) {
  const { data, error } = await supabase
    .from("user_activities")
    .select(`
      *,
      group_activities (name, activity_type, relation_id, activity_relations (name)),
      groups (name)
    `)
    .eq("username", username)
    .order("completed_at", { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, activities: data || [] }
}

export async function getGroupRanking(groupId: string, period: "week" | "biweekly" | "month" | "quarter" = "week") {
  const dateFilter = new Date()

  switch (period) {
    case "week":
      dateFilter.setDate(dateFilter.getDate() - 7)
      break
    case "biweekly":
      dateFilter.setDate(dateFilter.getDate() - 14)
      break
    case "month":
      dateFilter.setMonth(dateFilter.getMonth() - 1)
      break
    case "quarter":
      dateFilter.setMonth(dateFilter.getMonth() - 3)
      break
  }

  const { data, error } = await supabase
    .from("user_activities")
    .select("username, points_earned")
    .eq("group_id", groupId)
    .gte("completed_at", dateFilter.toISOString())

  if (error) {
    return []
  }

  // Group by username and sum points
  const ranking = data.reduce((acc: any, activity) => {
    if (!acc[activity.username]) {
      acc[activity.username] = 0
    }
    acc[activity.username] += activity.points_earned
    return acc
  }, {})

  return Object.entries(ranking)
    .map(([username, points]) => ({ username, points }))
    .sort((a: any, b: any) => b.points - a.points)
}

// Helper function to get Monday of a given week
function getMondayOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is Sunday
  const monday = new Date(date.setDate(diff))
  monday.setHours(0, 1, 0, 0) // Set to 00:01
  return monday
}

// Helper function to get Sunday of a given week
function getSundayOfWeek(date: Date): Date {
  const monday = getMondayOfWeek(new Date(date))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999) // Set to 23:59:59
  return sunday
}

export async function getGroupRankingByWeek(groupId: string, weekNumber: number) {
  let startDate: Date
  let endDate: Date

  if (weekNumber === 0) {
    // Current week (Monday 00:01 to Sunday 23:59)
    const now = new Date()
    startDate = getMondayOfWeek(new Date(now))
    endDate = getSundayOfWeek(new Date(now))
  } else {
    // Specific week number (from start of year)
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Find the first Monday of the year
    const firstMonday = getMondayOfWeek(new Date(startOfYear))

    // Calculate the Monday of the specified week
    startDate = new Date(firstMonday)
    startDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7)
    startDate.setHours(0, 1, 0, 0) // Monday 00:01

    // Calculate the Sunday of the specified week
    endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    endDate.setHours(23, 59, 59, 999) // Sunday 23:59
  }

  const { data, error } = await supabase
    .from("user_activities")
    .select("username, points_earned")
    .eq("group_id", groupId)
    .gte("completed_at", startDate.toISOString())
    .lte("completed_at", endDate.toISOString())

  if (error) {
    return []
  }

  // Group by username and sum points
  const ranking = data.reduce((acc: any, activity) => {
    if (!acc[activity.username]) {
      acc[activity.username] = 0
    }
    acc[activity.username] += activity.points_earned
    return acc
  }, {})

  return Object.entries(ranking)
    .map(([username, points]) => ({ username, points }))
    .sort((a, b) => b.points - a.points)
}

export async function getGroupRankingTotal(groupId: string) {
  // Fetch all activities using pagination to avoid 1000 row limit
  const allActivities: any[] = []
  let offset = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from("user_activities")
      .select("username, points_earned")
      .eq("group_id", groupId)
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.log("[v0] Error fetching activities for ranking:", error.message)
      break
    }

    if (data && data.length > 0) {
      allActivities.push(...data)
      offset += pageSize
      hasMore = data.length === pageSize
    } else {
      hasMore = false
    }
  }

  if (allActivities.length === 0) {
    return []
  }

  // Group by username and sum points
  const ranking = allActivities.reduce((acc: any, activity) => {
    if (!acc[activity.username]) {
      acc[activity.username] = 0
    }
    acc[activity.username] += activity.points_earned
    return acc
  }, {})

  return Object.entries(ranking)
    .map(([username, points]) => ({ username, points }))
    .sort((a, b) => b.points - a.points)
}

export async function getGroupMembersWithTotalPoints(groupId: string) {
  // Get all group members with their avatars
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select(`
      username,
      profiles (avatar, avatar_url)
    `)
    .eq("group_id", groupId)

  if (membersError || !members) {
    return []
  }

  // Fetch all activities using pagination to avoid 1000 row limit
  const allActivities: any[] = []
  let offset = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: activities, error: activitiesError } = await supabase
      .from("user_activities")
      .select("username, points_earned, completed_at")
      .eq("group_id", groupId)
      .range(offset, offset + pageSize - 1)

    if (activitiesError) {
      console.log("[v0] Error fetching activities:", activitiesError.message)
      break
    }

    if (activities && activities.length > 0) {
      allActivities.push(...activities)
      offset += pageSize
      hasMore = activities.length === pageSize
    } else {
      hasMore = false
    }
  }

  // Calculate total points for each user
  const pointsByUser =
    allActivities.reduce((acc: any, activity) => {
      if (!acc[activity.username]) {
        acc[activity.username] = 0
      }
      acc[activity.username] += activity.points_earned
      return acc
    }, {}) || {}

  const totalWeeksWithActivity = await getWeeksWithData(groupId)
  const totalWeeksCount = totalWeeksWithActivity.length

  // Create ranking including all members (even with 0 points)
  const ranking = members.map((member: any) => {
    const totalPoints = pointsByUser[member.username] || 0
    const avgPerWeek = totalWeeksCount > 0 ? Math.round(totalPoints / totalWeeksCount) : 0

    return {
      username: member.username,
      avatar: member.profiles?.avatar || member.profiles?.avatar_url || "default",
      points: totalPoints,
      avgPerWeek: avgPerWeek,
    }
  })

  // Sort by points (highest first)
  return ranking.sort((a, b) => b.points - a.points)
}

export async function getWeeksWithData(groupId: string) {
  // Fetch all activities using pagination to avoid 1000 row limit
  const allData: any[] = []
  let offset = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from("user_activities")
      .select("completed_at")
      .eq("group_id", groupId)
      .order("completed_at", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.log("[v0] Error fetching weeks data:", error.message)
      break
    }

    if (data && data.length > 0) {
      allData.push(...data)
      offset += pageSize
      hasMore = data.length === pageSize
    } else {
      hasMore = false
    }
  }

  if (allData.length === 0) {
    return []
  }
  
  const data = allData

  // Calculate week numbers for all activities using Monday-Sunday weeks
  const weekNumbers = new Set<number>()

  data.forEach((activity) => {
    const activityDate = new Date(activity.completed_at)
    const startOfYear = new Date(activityDate.getFullYear(), 0, 1)

    // Find the first Monday of the year
    const firstMonday = getMondayOfWeek(new Date(startOfYear))

    // Calculate which week this activity falls into
    const activityMonday = getMondayOfWeek(new Date(activityDate))
    const weeksDiff = Math.floor((activityMonday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const weekNumber = weeksDiff + 1

    if (weekNumber > 0) {
      weekNumbers.add(weekNumber)
    }
  })

  // Convert to sorted array
  return Array.from(weekNumbers).sort((a, b) => a - b)
}

export async function getAllGroupActivities(groupId: string) {
  // Fetch all activities using pagination to avoid 1000 row limit
  const allActivities: any[] = []
  let offset = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from("user_activities")
      .select(`
        *,
        group_activities (name, activity_type, relation_id, activity_relations (name)),
        profiles (username, avatar, avatar_url)
      `)
      .eq("group_id", groupId)
      .order("completed_at", { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.log("[v0] Error fetching all group activities:", error.message)
      return { success: false, error: error.message }
    }

    if (data && data.length > 0) {
      allActivities.push(...data)
      offset += pageSize
      hasMore = data.length === pageSize
    } else {
      hasMore = false
    }
  }

  return { success: true, activities: allActivities }
}

export async function getUserActivities(username: string, limit = 10) {
  const { data, error } = await supabase
    .from("user_activities")
    .select(`
      *,
      group_activities(name),
      groups(name)
    `)
    .eq("username", username)
    .order("completed_at", { ascending: false })
    .limit(limit)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, activities: data }
}

export async function getUserWeightReports(username: string) {
  const { data, error } = await supabase
    .from("bi_weekly_reports")
    .select("*")
    .eq("username", username)
    .order("report_date", { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, reports: data }
}

export async function getWeeklyWinners(groupId: string) {
  // Get the first activity date for this group to determine the start
  const { data: firstActivity, error: firstError } = await supabase
    .from("user_activities")
    .select("completed_at")
    .eq("group_id", groupId)
    .order("completed_at", { ascending: true })
    .limit(1)

  if (firstError || !firstActivity || firstActivity.length === 0) {
    return []
  }

  const startDate = new Date(firstActivity[0].completed_at)
  const currentDate = new Date()

  // Calculate all weeks from first activity to now
  const weeks = []
  let weekStart = getMondayOfWeek(new Date(startDate))

  while (weekStart <= currentDate) {
    const weekEnd = getSundayOfWeek(new Date(weekStart))

    // Get ranking for this specific week
    const { data, error } = await supabase
      .from("user_activities")
      .select("username, points_earned")
      .eq("group_id", groupId)
      .gte("completed_at", weekStart.toISOString())
      .lte("completed_at", weekEnd.toISOString())

    if (!error && data && data.length > 0) {
      // Calculate points for this week
      const weeklyPoints = data.reduce((acc: any, activity) => {
        if (!acc[activity.username]) {
          acc[activity.username] = 0
        }
        acc[activity.username] += activity.points_earned
        return acc
      }, {})

      // Find the winner (highest points)
      const winner = Object.entries(weeklyPoints)
        .map(([username, points]) => ({ username, points }))
        .sort((a: any, b: any) => b.points - a.points)[0]

      if (winner && winner.points > 0) {
        weeks.push({
          weekStart: weekStart.toLocaleDateString(),
          weekEnd: weekEnd.toLocaleDateString(),
          winner: winner.username,
          points: winner.points,
        })
      }
    }

    // Move to next week
    weekStart = new Date(weekStart)
    weekStart.setDate(weekStart.getDate() + 7)
  }

  // Count wins per user
  const winCounts = weeks.reduce((acc: any, week) => {
    if (!acc[week.winner]) {
      acc[week.winner] = 0
    }
    acc[week.winner]++
    return acc
  }, {})

  return Object.entries(winCounts)
    .map(([username, wins]) => ({ username, wins }))
    .sort((a: any, b: any) => b.wins - a.wins)
}

async function getWeeklyRankingPosition(username: string, groupId: string) {
  const now = new Date()
  const startDate = getMondayOfWeek(new Date(now))
  const endDate = getSundayOfWeek(new Date(now))

  try {
    const { data, error } = await supabase.rpc("get_weekly_ranking_optimized", {
      p_group_id: groupId,
      p_username: username,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    })

    // If function doesn't exist (404) or returns no data, use fallback
    if (error || !data || data.length === 0) {
      return await getWeeklyRankingPositionFallback(username, groupId, startDate, endDate)
    }

    const result = data[0]

    // Calculate days remaining in the week
    const sunday = getSundayOfWeek(new Date(now))
    const daysRemaining = Math.ceil((sunday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      position: result.user_position || 0,
      totalUsers: result.total_users || 0,
      isInPodium: result.user_position > 0 && result.user_position <= 3,
      daysRemaining: daysRemaining,
      userPoints: result.user_points || 0,
      firstPlaceUsername: result.first_place_username || "",
      firstPlacePoints: result.first_place_points || 0,
      pointsToFirst: (result.first_place_points || 0) - (result.user_points || 0),
      pointsToPodium: Math.max(0, (result.third_place_points || 0) - (result.user_points || 0) + 1),
    }
  } catch (error) {
    // If RPC call fails for any reason, use fallback method
    console.log("[v0] Using fallback ranking calculation")
    return await getWeeklyRankingPositionFallback(username, groupId, startDate, endDate)
  }
}

async function getWeeklyRankingPositionFallback(username: string, groupId: string, startDate: Date, endDate: Date) {
  // Get all activities for the week in a single query with aggregation
  const { data, error } = await supabase
    .from("user_activities")
    .select("username, points_earned")
    .eq("group_id", groupId)
    .gte("completed_at", startDate.toISOString())
    .lte("completed_at", endDate.toISOString())

  if (error || !data) {
    return {
      position: 0,
      totalUsers: 0,
      isInPodium: false,
      daysRemaining: 0,
      userPoints: 0,
      firstPlaceUsername: "",
      firstPlacePoints: 0,
      pointsToFirst: 0,
      pointsToPodium: 0,
    }
  }

  // Aggregate points by user
  const userPointsMap = new Map<string, number>()
  for (const activity of data) {
    const current = userPointsMap.get(activity.username) || 0
    userPointsMap.set(activity.username, current + activity.points_earned)
  }

  // Convert to sorted array
  const ranking = Array.from(userPointsMap.entries())
    .map(([user, points]) => ({ username: user, points }))
    .sort((a, b) => b.points - a.points)

  // Find user's position
  const userIndex = ranking.findIndex((entry) => entry.username === username)
  const userPosition = userIndex >= 0 ? userIndex + 1 : 0
  const userPoints = userIndex >= 0 ? ranking[userIndex].points : 0

  // Get podium info
  const firstPlace = ranking[0] || { username: "", points: 0 }
  const thirdPlace = ranking[2] || { username: "", points: 0 }

  // Calculate days remaining
  const now = new Date()
  const sunday = getSundayOfWeek(new Date(now))
  const daysRemaining = Math.ceil((sunday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    position: userPosition,
    totalUsers: ranking.length,
    isInPodium: userPosition > 0 && userPosition <= 3,
    daysRemaining: daysRemaining,
    userPoints: userPoints,
    firstPlaceUsername: firstPlace.username,
    firstPlacePoints: firstPlace.points,
    pointsToFirst: firstPlace.points - userPoints,
    pointsToPodium: Math.max(0, thirdPlace.points - userPoints + 1),
  }
}

async function getOptimisticRankingPosition(username: string, groupId: string, pointsToAdd: number) {
  const now = new Date()
  const startDate = getMondayOfWeek(new Date(now))
  const endDate = getSundayOfWeek(new Date(now))

  // Get current week's activities in a single optimized query
  const { data, error } = await supabase
    .from("user_activities")
    .select("username, points_earned")
    .eq("group_id", groupId)
    .gte("completed_at", startDate.toISOString())
    .lte("completed_at", endDate.toISOString())

  if (error || !data) {
    return {
      position: 1,
      totalUsers: 1,
      isInPodium: true,
      daysRemaining: 0,
      userPoints: pointsToAdd,
      firstPlaceUsername: username,
      firstPlacePoints: pointsToAdd,
      pointsToFirst: 0,
      pointsToPodium: 0,
    }
  }

  // Aggregate points by user
  const userPointsMap = new Map<string, number>()
  for (const activity of data) {
    const current = userPointsMap.get(activity.username) || 0
    userPointsMap.set(activity.username, current + activity.points_earned)
  }

  // Add the new points optimistically to the current user
  const currentUserPoints = userPointsMap.get(username) || 0
  const newUserPoints = currentUserPoints + pointsToAdd
  userPointsMap.set(username, newUserPoints)

  // Convert to sorted array
  const ranking = Array.from(userPointsMap.entries())
    .map(([user, points]) => ({ username: user, points }))
    .sort((a, b) => b.points - a.points)

  // Find user's new position
  const userIndex = ranking.findIndex((entry) => entry.username === username)
  const userPosition = userIndex >= 0 ? userIndex + 1 : 0
  const userPoints = userIndex >= 0 ? ranking[userIndex].points : 0

  // Get podium info
  const firstPlace = ranking[0] || { username: "", points: 0 }
  const thirdPlace = ranking[2] || { username: "", points: 0 }

  // Calculate days remaining
  const sunday = getSundayOfWeek(new Date(now))
  const daysRemaining = Math.ceil((sunday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    position: userPosition,
    totalUsers: ranking.length,
    isInPodium: userPosition > 0 && userPosition <= 3,
    daysRemaining: daysRemaining,
    userPoints: newUserPoints,
    firstPlaceUsername: firstPlace.username,
    firstPlacePoints: firstPlace.points,
    pointsToFirst: firstPlace.points - newUserPoints,
    pointsToPodium: Math.max(0, thirdPlace.points - newUserPoints + 1),
  }
}

// ============================================
// RODEOS FUNCTIONS
// ============================================

export async function initializeRodeo(groupId: string) {
  console.log("[v0] Initializing rodeo for group:", groupId)

  const { data: existingStandings } = await supabase.from("groups_rodeo_standings").select("id").eq("group_id", groupId)

  if (existingStandings && existingStandings.length > 0) {
    console.log("[v0] Standings already exist, checking fixtures")

    // Check if fixtures exist
    const now = new Date()
    const weekNumber = getWeekNumber(getMondayOfWeek(new Date(now)))
    const { data: existingFixtures } = await supabase
      .from("groups_rodeo_fixtures")
      .select("id")
      .eq("group_id", groupId)
      .eq("week_number", weekNumber)

    if (!existingFixtures || existingFixtures.length === 0) {
      // Standings exist but no fixtures, generate them
      const fixturesResult = await generateWeeklyFixtures(groupId)
      revalidatePath(`/groups/${groupId}/rodeos`)
      revalidatePath(`/groups/${groupId}`)
      return { success: true, message: "Fixtures generados para la semana actual" }
    }

    return { success: true, message: "Rodeo ya está inicializado" }
  }

  // Get all group members
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("username")
    .eq("group_id", groupId)

  console.log("[v0] Found members:", members?.length, "Error:", membersError)

  if (membersError) {
    console.error("[v0] Error fetching members:", membersError)
    return { success: false, error: `Error al obtener miembros: ${membersError.message}` }
  }

  if (!members || members.length < 2) {
    return { success: false, error: "Se necesitan al menos 2 miembros para iniciar un rodeo" }
  }

  const now = new Date()
  const weekNumber = getWeekNumber(getMondayOfWeek(new Date(now)))
  const { data: orphanedFixtures } = await supabase
    .from("groups_rodeo_fixtures")
    .select("id")
    .eq("group_id", groupId)
    .eq("week_number", weekNumber)

  if (orphanedFixtures && orphanedFixtures.length > 0) {
    console.log("[v0] Cleaning up orphaned fixtures:", orphanedFixtures.length)
    await supabase.from("groups_rodeo_fixtures").delete().eq("group_id", groupId).eq("week_number", weekNumber)
  }

  // Initialize standings for all members
  const standingsData = members.map((member) => ({
    group_id: groupId,
    player_username: member.username,
    wins: 0,
    losses: 0,
    draws: 0,
    proteins: 0,
    creatines: 0,
    bye_count: 0,
    current_streak: 0,
    best_streak: 0,
    total_score: 0,
  }))

  console.log("[v0] Inserting standings data:", standingsData)

  const { data: insertedStandings, error: standingsError } = await supabase
    .from("groups_rodeo_standings")
    .insert(standingsData)
    .select()

  console.log("[v0] Standings insert result:", {
    success: !standingsError,
    error: standingsError,
    insertedCount: insertedStandings?.length,
  })

  if (standingsError) {
    console.error("[v0] Detailed standings error:", {
      message: standingsError.message,
      details: standingsError.details,
      hint: standingsError.hint,
      code: standingsError.code,
    })
    return {
      success: false,
      error: `Error al crear standings: ${standingsError.message}. Por favor, ejecuta el script SQL 15-simplify-rodeos-rls.sql`,
    }
  }

  if (!insertedStandings || insertedStandings.length === 0) {
    return { success: false, error: "No se pudieron crear los standings. Verifica las políticas RLS." }
  }

  console.log("[v0] Successfully inserted standings, generating fixtures")

  // Generate first week's fixtures
  const fixturesResult = await generateWeeklyFixtures(groupId)
  console.log("[v0] Fixtures generation result:", fixturesResult)

  if (!fixturesResult.success) {
    return { success: false, error: `Standings creados pero error al generar fixtures: ${fixturesResult.error}` }
  }

  revalidatePath(`/groups/${groupId}/rodeos`)
  revalidatePath(`/groups/${groupId}`)
  return { success: true, message: "Rodeo inicializado exitosamente" }
}

export async function generateWeeklyFixtures(groupId: string) {
  console.log("[v0] Generating weekly fixtures for group:", groupId)

  const now = new Date()
  const weekStart = getMondayOfWeek(new Date(now))
  const weekEnd = getSundayOfWeek(new Date(now))
  const weekNumber = getWeekNumber(weekStart)

  console.log("[v0] Week info:", { weekNumber, weekStart, weekEnd })

  // Check if fixtures already exist for this week
  const { data: existingFixtures } = await supabase
    .from("groups_rodeo_fixtures")
    .select("id")
    .eq("group_id", groupId)
    .eq("week_number", weekNumber)

  if (existingFixtures && existingFixtures.length > 0) {
    console.log("[v0] Fixtures already exist for this week")
    return { success: true, message: "Los fixtures de esta semana ya existen" }
  }

  // Get all active members
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("username")
    .eq("group_id", groupId)

  console.log("[v0] Members for fixtures:", members?.length, "Error:", membersError)

  if (membersError || !members || members.length < 2) {
    return { success: false, error: "Se necesitan al menos 2 miembros" }
  }

  // Get standings to check bye counts
  const { data: standings } = await supabase.from("groups_rodeo_standings").select("*").eq("group_id", groupId)

  console.log("[v0] Standings:", standings)

  const { data: matchupHistory } = await supabase
    .from("groups_rodeo_matchup_history")
    .select("player_a_username, player_b_username")
    .eq("group_id", groupId)

  console.log("[v0] Matchup history from groups_rodeo_matchup_history:", matchupHistory?.length || 0, "records")

  const normalizeUsername = (username: string) => username.trim()

  const matchupMap = new Map<string, number>()
  matchupHistory?.forEach((match) => {
    const playerA = normalizeUsername(match.player_a_username)
    const playerB = match.player_b_username ? normalizeUsername(match.player_b_username) : null

    // Skip BYE matches (where player_b is null)
    if (!playerB) {
      console.log(`[v0] Skipping BYE match for "${playerA}"`)
      return
    }

    const key = [playerA, playerB].sort().join("-")
    const currentCount = matchupMap.get(key) || 0
    matchupMap.set(key, currentCount + 1)
    console.log(`[v0] Loaded matchup: "${playerA}" vs "${playerB}" = ${currentCount + 1} times (key: "${key}")`)
  })

  const availablePlayers = [...members.map((m) => normalizeUsername(m.username))]
  console.log("[v0] Available players for matchups:", availablePlayers)

  // Create standings map for bye counts
  const standingsMap = new Map(standings?.map((s) => [normalizeUsername(s.player_username), s.bye_count]) || [])

  const fixtures = []

  // Determine if someone needs a bye (odd number of players)
  let byePlayer: string | null = null
  if (availablePlayers.length % 2 !== 0) {
    // Find minimum bye count
    const minByeCount = Math.min(...availablePlayers.map((p) => standingsMap.get(p) || 0))

    // Get all players with minimum bye count
    const candidatesForBye = availablePlayers.filter((p) => (standingsMap.get(p) || 0) === minByeCount)

    console.log("[v0] Candidates for bye (min count:", minByeCount, "):", candidatesForBye)

    // Pick the first candidate (could be randomized)
    byePlayer = candidatesForBye[0]

    console.log("[v0] Bye player:", byePlayer)

    // Create bye fixture
    fixtures.push({
      group_id: groupId,
      week_start: weekStart.toISOString().split("T")[0],
      week_end: weekEnd.toISOString().split("T")[0],
      week_number: weekNumber,
      player_a_username: byePlayer,
      player_b_username: null,
      is_bye: true,
      status: "closed", // Bye is automatically closed
      score_a: 0,
      score_b: 0,
    })

    // Remove bye player from matchup pool
    availablePlayers.splice(availablePlayers.indexOf(byePlayer), 1)
  }

  console.log("[v0] Available players for matchups after bye consideration:", availablePlayers)

  // Strategy: Always pick the matchup with lowest play count that doesn't isolate players
  while (availablePlayers.length >= 2) {
    let bestPair: { playerA: string; playerB: string; timesPlayed: number } | null = null
    let bestScore = Number.POSITIVE_INFINITY

    // Try all possible pairings and score them
    for (let i = 0; i < availablePlayers.length - 1; i++) {
      for (let j = i + 1; j < availablePlayers.length; j++) {
        const playerA = availablePlayers[i]
        const playerB = availablePlayers[j]
        const matchupKey = [playerA, playerB].sort().join("-")
        const timesPlayed = matchupMap.get(matchupKey) || 0

        console.log(
          `[v0] Evaluating pair: "${playerA}" vs "${playerB}" -> key: "${matchupKey}" -> ${timesPlayed} times`,
        )

        // Calculate a score for this pairing
        // Lower is better: prioritize fewer times played
        // But also consider what happens to remaining players
        let score = timesPlayed * 1000

        // If this is the last pair, just use it
        if (availablePlayers.length === 2) {
          score = timesPlayed
        } else {
          // Check if this pairing would leave problematic remaining players
          const remainingPlayers = availablePlayers.filter((p) => p !== playerA && p !== playerB)

          // Calculate average times played for remaining possible matchups
          let remainingTotal = 0
          let remainingCount = 0
          for (let k = 0; k < remainingPlayers.length - 1; k++) {
            for (let l = k + 1; l < remainingPlayers.length; l++) {
              const key = [remainingPlayers[k], remainingPlayers[l]].sort().join("-")
              remainingTotal += matchupMap.get(key) || 0
              remainingCount++
            }
          }

          const remainingAvg = remainingCount > 0 ? remainingTotal / remainingCount : 0
          // Add penalty if remaining matchups have higher average play count
          score += remainingAvg * 10
        }

        if (score < bestScore) {
          bestScore = score
          bestPair = { playerA, playerB, timesPlayed }
        }
      }
    }

    if (!bestPair) {
      console.error("[v0] Could not find any valid pairing")
      break
    }

    console.log(
      "[v0] Pairing:",
      bestPair.playerA,
      "vs",
      bestPair.playerB,
      "(played together:",
      bestPair.timesPlayed,
      "times, score:",
      bestScore.toFixed(2),
      ")",
    )

    fixtures.push({
      group_id: groupId,
      week_start: weekStart.toISOString().split("T")[0],
      week_end: weekEnd.toISOString().split("T")[0],
      week_number: weekNumber,
      player_a_username: bestPair.playerA,
      player_b_username: bestPair.playerB,
      is_bye: false,
      status: "pending",
      score_a: 0,
      score_b: 0,
    })

    // Remove used players
    availablePlayers.splice(availablePlayers.indexOf(bestPair.playerA), 1)
    availablePlayers.splice(availablePlayers.indexOf(bestPair.playerB), 1)
  }

  console.log("[v0] Generated fixtures:", fixtures.length)

  // Insert fixtures
  const { error: fixturesError } = await supabase.from("groups_rodeo_fixtures").insert(fixtures)

  console.log("[v0] Fixtures insert error:", fixturesError)

  if (fixturesError) {
    return { success: false, error: fixturesError.message }
  }

  // Update bye count if someone got a bye
  if (byePlayer) {
    const currentByeCount = standingsMap.get(byePlayer) || 0
    await supabase
      .from("groups_rodeo_standings")
      .update({ bye_count: currentByeCount + 1 })
      .eq("group_id", groupId)
      .eq("player_username", byePlayer)

    console.log("[v0] Updated bye count for", byePlayer, "to", currentByeCount + 1)
  }

  // Update matchup history for all non-bye fixtures
  for (const fixture of fixtures) {
    if (!fixture.is_bye && fixture.player_b_username) {
      const matchupKey = [fixture.player_a_username, fixture.player_b_username].sort()
      const existingCount = matchupMap.get(matchupKey.join("-")) || 0

      // Upsert matchup history
      await supabase.from("groups_rodeo_matchup_history").upsert(
        {
          group_id: groupId,
          player_a_username: matchupKey[0],
          player_b_username: matchupKey[1],
          times_played: existingCount + 1,
        },
        {
          onConflict: "group_id,player_a_username,player_b_username",
        },
      )
    }
  }

  console.log("[v0] Updated matchup history")

  return { success: true, data: fixtures }
}

export async function regenerateWeeklyFixtures(groupId: string) {
  console.log("[v0] Regenerating weekly fixtures for group:", groupId)

  const now = new Date()
  const weekStart = getMondayOfWeek(new Date(now))
  const weekNumber = getWeekNumber(weekStart)

  // Get existing fixtures before deleting to rollback history
  const { data: existingFixtures, error: fetchError } = await supabase
    .from("groups_rodeo_fixtures")
    .select("*")
    .eq("group_id", groupId)
    .eq("week_number", weekNumber)

  if (fetchError) {
    console.error("[v0] Error fetching fixtures:", fetchError)
    return { success: false, error: fetchError.message }
  }

  console.log("[v0] Found", existingFixtures?.length || 0, "fixtures to rollback")

  // Rollback matchup history and bye counts
  if (existingFixtures && existingFixtures.length > 0) {
    for (const fixture of existingFixtures) {
      // Rollback matchup history for non-bye fixtures
      if (!fixture.is_bye && fixture.player_b_username) {
        const matchupKey = [fixture.player_a_username, fixture.player_b_username].sort()

        // Get current times played
        const { data: existingMatchup } = await supabase
          .from("groups_rodeo_matchup_history")
          .select("times_played")
          .eq("group_id", groupId)
          .eq("player_a_username", matchupKey[0])
          .eq("player_b_username", matchupKey[1])
          .maybeSingle()

        if (existingMatchup && existingMatchup.times_played > 0) {
          const newCount = existingMatchup.times_played - 1

          if (newCount === 0) {
            // Delete the record if it goes to 0
            await supabase
              .from("groups_rodeo_matchup_history")
              .delete()
              .eq("group_id", groupId)
              .eq("player_a_username", matchupKey[0])
              .eq("player_b_username", matchupKey[1])

            console.log("[v0] Deleted matchup history for", matchupKey[0], "vs", matchupKey[1])
          } else {
            // Decrement the counter
            await supabase
              .from("groups_rodeo_matchup_history")
              .update({ times_played: newCount })
              .eq("group_id", groupId)
              .eq("player_a_username", matchupKey[0])
              .eq("player_b_username", matchupKey[1])

            console.log("[v0] Decremented matchup history for", matchupKey[0], "vs", matchupKey[1], "to", newCount)
          }
        } else {
          console.log("[v0] No matchup history found for", matchupKey[0], "vs", matchupKey[1], "- skipping rollback")
        }
      }

      // Rollback bye count
      if (fixture.is_bye && fixture.player_a_username) {
        const { data: standing } = await supabase
          .from("groups_rodeo_standings")
          .select("bye_count")
          .eq("group_id", groupId)
          .eq("player_username", fixture.player_a_username)
          .single()

        if (standing && standing.bye_count > 0) {
          await supabase
            .from("groups_rodeo_standings")
            .update({ bye_count: standing.bye_count - 1 })
            .eq("group_id", groupId)
            .eq("player_username", fixture.player_a_username)

          console.log("[v0] Decremented bye count for", fixture.player_a_username, "to", standing.bye_count - 1)
        }
      }
    }
  }

  // Delete existing fixtures for current week
  const { error: deleteError } = await supabase
    .from("groups_rodeo_fixtures")
    .delete()
    .eq("group_id", groupId)
    .eq("week_number", weekNumber)

  if (deleteError) {
    console.error("[v0] Error deleting fixtures:", deleteError)
    return { success: false, error: deleteError.message }
  }

  console.log("[v0] Deleted existing fixtures, generating new ones")

  // Generate new fixtures (this will update history and bye counts again)
  return await generateWeeklyFixtures(groupId)
}

export async function closeWeeklyFixtures(groupId: string) {
  console.log("[v0] closeWeeklyFixtures called for group:", groupId)

  // Get all pending fixtures for this group, ordered by week number descending
  const { data: fixtures, error: fixturesError } = await supabase
    .from("groups_rodeo_fixtures")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("week_number", { ascending: false })

  if (fixturesError || !fixtures || fixtures.length === 0) {
    console.log("[v0] No pending fixtures found to close")
    return { success: false, error: "No hay fixtures pendientes para cerrar" }
  }

  // Get the most recent week number with pending fixtures
  const weekNumber = fixtures[0].week_number
  console.log("[v0] Closing fixtures for week:", weekNumber)

  // Filter fixtures for that specific week
  const weekFixtures = fixtures.filter((f) => f.week_number === weekNumber)

  // Get weekly ranking to determine scores
  const weekStart = getMondayOfWeek(new Date())
  const weeksAgo = getWeekNumber(weekStart) - weekNumber
  console.log("[v0] Getting ranking for week", weekNumber, "which is", weeksAgo, "weeks ago")

  const ranking = await getGroupRankingByWeek(groupId, weeksAgo)
  const scoresMap = new Map(ranking.map((r: any) => [r.username, r.points]))
  console.log("[v0] Scores for week:", Object.fromEntries(scoresMap))

  // Process each fixture
  for (const fixture of weekFixtures) {
    const scoreA = scoresMap.get(fixture.player_a_username) || 0
    const scoreB = fixture.player_b_username ? scoresMap.get(fixture.player_b_username) || 0 : 0

    console.log(
      `[v0] Processing fixture: ${fixture.player_a_username} (${scoreA}) vs ${fixture.player_b_username} (${scoreB})`,
    )

    let winnerUsername: string | null = null
    let isDraw = false

    if (!fixture.is_bye) {
      if (scoreA > scoreB) {
        winnerUsername = fixture.player_a_username
      } else if (scoreB > scoreA) {
        winnerUsername = fixture.player_b_username
      } else {
        isDraw = true
      }
    } else {
      // BYE week - player_a automatically wins
      winnerUsername = fixture.player_a_username
    }

    // Update fixture
    await supabase
      .from("groups_rodeo_fixtures")
      .update({
        status: "closed",
        score_a: scoreA,
        score_b: scoreB,
        winner_username: winnerUsername,
        closed_at: new Date().toISOString(),
      })
      .eq("id", fixture.id)

    const { error: historyError } = await supabase.rpc("save_fixture_to_history", {
      p_fixture_id: fixture.id,
    })

    if (historyError) {
      console.error("[v0] Error saving fixture to history:", historyError)
    }

    // Update standings
    if (winnerUsername) {
      // Winner gets 1 protein
      const { data: standing } = await supabase
        .from("groups_rodeo_standings")
        .select("*")
        .eq("group_id", groupId)
        .eq("player_username", winnerUsername)
        .single()

      if (standing) {
        const newProteins = standing.proteins + 1
        const newCreatines = standing.creatines + Math.floor(newProteins / 5) - Math.floor(standing.proteins / 5)
        const newWins = standing.wins + 1
        const newStreak = standing.current_streak >= 0 ? standing.current_streak + 1 : 1
        const newBestStreak = Math.max(standing.best_streak, newStreak)

        await supabase
          .from("groups_rodeo_standings")
          .update({
            wins: newWins,
            proteins: newProteins,
            creatines: standing.creatines + newCreatines,
            current_streak: newStreak,
            best_streak: newBestStreak,
            total_score: standing.total_score + scoreA,
          })
          .eq("id", standing.id)
      }

      // Update loser
      const loserUsername =
        winnerUsername === fixture.player_a_username ? fixture.player_b_username : fixture.player_a_username
      if (loserUsername) {
        const { data: loserStanding } = await supabase
          .from("groups_rodeo_standings")
          .select("*")
          .eq("group_id", groupId)
          .eq("player_username", loserUsername)
          .single()

        if (loserStanding) {
          const newLosses = loserStanding.losses + 1
          const newStreak = loserStanding.current_streak <= 0 ? loserStanding.current_streak - 1 : -1
          const loserScore = loserUsername === fixture.player_a_username ? scoreA : scoreB

          await supabase
            .from("groups_rodeo_standings")
            .update({
              losses: newLosses,
              current_streak: newStreak,
              total_score: loserStanding.total_score + loserScore,
            })
            .eq("id", loserStanding.id)
        }
      }
    } else if (isDraw) {
      // Both players get a draw
      for (const playerUsername of [fixture.player_a_username, fixture.player_b_username]) {
        if (!playerUsername) continue

        const { data: standing } = await supabase
          .from("groups_rodeo_standings")
          .select("*")
          .eq("group_id", groupId)
          .eq("player_username", playerUsername)
          .single()

        if (standing) {
          const playerScore = playerUsername === fixture.player_a_username ? scoreA : scoreB
          await supabase
            .from("groups_rodeo_standings")
            .update({
              draws: standing.draws + 1,
              current_streak: 0,
              total_score: standing.total_score + playerScore,
            })
            .eq("id", standing.id)
        }
      }
    }
  }

  revalidatePath(`/groups/${groupId}/rodeos`)
  revalidatePath(`/groups/${groupId}`)
  return { success: true, message: "Fixtures cerrados exitosamente" }
}

export async function getRodeoStandings(groupId: string) {
  // Get all history to calculate real standings
  const { data: historyData, error: historyError } = await supabase.rpc("get_rodeo_history", {
    p_group_id: groupId,
  })

  if (historyError || !historyData || historyData.length === 0) {
    // Fallback to groups_rodeo_standings if no history
    const { data: standings, error } = await supabase
      .from("groups_rodeo_standings")
      .select("*")
      .eq("group_id", groupId)
      .order("proteins", { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    if (!standings || standings.length === 0) {
      return { success: true, standings: [] }
    }

    const usernames = standings.map((s) => s.player_username)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("username, avatar, avatar_url")
      .in("username", usernames)

    const profilesMap = new Map(profiles?.map((p) => [p.username, p]) || [])

    const enrichedStandings = standings.map((standing) => ({
      ...standing,
      profiles: profilesMap.get(standing.player_username) || null,
    }))

    return { success: true, standings: enrichedStandings }
  }

  // Calculate standings from history
  const standingsMap = new Map<string, any>()

  // Get all group members to initialize everyone
  const { data: members } = await supabase.from("group_members").select("username").eq("group_id", groupId)

  // Initialize all members
  members?.forEach((member) => {
    standingsMap.set(member.username, {
      player_username: member.username,
      wins: 0,
      losses: 0,
      draws: 0,
      proteins: 0,
      creatines: 0,
      bye_count: 0,
      current_streak: 0,
      best_streak: 0,
      total_score: 0,
    })
  })

  // Process history entries
  historyData.forEach((entry: any) => {
    if (entry.is_bye) {
      // BYE doesn't count as win/loss
      const player = standingsMap.get(entry.player_a_username)
      if (player) {
        player.bye_count++
      }
    } else {
      const playerA = standingsMap.get(entry.player_a_username)
      const playerB = standingsMap.get(entry.player_b_username)

      if (playerA) {
        playerA.total_score += entry.player_a_points || 0
      }
      if (playerB) {
        playerB.total_score += entry.player_b_points || 0
      }

      if (entry.winner_username) {
        const winner = standingsMap.get(entry.winner_username)
        const loser = entry.winner_username === entry.player_a_username ? playerB : playerA

        if (winner) {
          winner.wins++
          winner.proteins++ // proteins = wins
          winner.current_streak = winner.current_streak > 0 ? winner.current_streak + 1 : 1
          winner.best_streak = Math.max(winner.best_streak, winner.current_streak)
        }

        if (loser) {
          loser.losses++
          loser.current_streak = loser.current_streak < 0 ? loser.current_streak - 1 : -1
        }
      } else {
        // Draw
        if (playerA) {
          playerA.draws++
          playerA.current_streak = 0
        }
        if (playerB) {
          playerB.draws++
          playerB.current_streak = 0
        }
      }
    }
  })

  // Convert map to array and sort by proteins (wins)
  const standings = Array.from(standingsMap.values()).sort((a, b) => {
    if (b.proteins !== a.proteins) return b.proteins - a.proteins
    return b.total_score - a.total_score // Tiebreaker by total score
  })

  // Get profiles
  const usernames = standings.map((s) => s.player_username)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username, avatar, avatar_url")
    .in("username", usernames)

  const profilesMap = new Map(profiles?.map((p) => [p.username, p]) || [])

  const enrichedStandings = standings.map((standing) => ({
    ...standing,
    profiles: profilesMap.get(standing.player_username) || null,
  }))

  return { success: true, standings: enrichedStandings }
}

export async function getCurrentWeekFixtures(groupId: string) {
  const now = new Date()
  const weekNumber = getWeekNumber(getMondayOfWeek(new Date(now)))

  const { data: fixtures, error } = await supabase
    .from("groups_rodeo_fixtures")
    .select("*")
    .eq("group_id", groupId)
    .eq("week_number", weekNumber)
    .order("created_at", { ascending: true })

  if (error) {
    return { success: false, error: error.message }
  }

  if (!fixtures || fixtures.length === 0) {
    return { success: true, fixtures: [] }
  }

  // Get all unique usernames from fixtures
  const usernames = new Set<string>()
  fixtures.forEach((fixture) => {
    usernames.add(fixture.player_a_username)
    if (fixture.player_b_username) {
      usernames.add(fixture.player_b_username)
    }
  })

  // Get profiles for all players
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username, avatar, avatar_url")
    .in("username", Array.from(usernames))

  // Create a map of profiles
  const profilesMap = new Map(profiles?.map((p) => [p.username, p]) || [])

  // Get current week's scores
  const ranking = await getGroupRankingByWeek(groupId, 0)
  const scoresMap = new Map(ranking.map((r: any) => [r.username, r.points]))

  // Enrich fixtures with current scores and profile data
  const enrichedFixtures = fixtures.map((fixture) => ({
    ...fixture,
    current_score_a: scoresMap.get(fixture.player_a_username) || 0,
    current_score_b: fixture.player_b_username ? scoresMap.get(fixture.player_b_username) || 0 : 0,
    player_a_profile: profilesMap.get(fixture.player_a_username) || null,
    player_b_profile: fixture.player_b_username ? profilesMap.get(fixture.player_b_username) || null : null,
  }))

  return { success: true, fixtures: enrichedFixtures }
}

export async function getRodeoHistory(groupId: string) {
  console.log("[v0] getRodeoHistory called for group:", groupId)

  const { data: historyData, error: historyError } = await supabase.rpc("get_rodeo_history", {
    p_group_id: groupId,
  })

  console.log("[v0] History RPC result:", {
    hasError: !!historyError,
    error: historyError,
    dataLength: historyData?.length || 0,
    data: historyData,
  })

  if (!historyError && historyData && historyData.length > 0) {
    console.log("[v0] Found", historyData.length, "history entries from history table")

    // Group by week
    const weeklyResults = historyData.reduce((acc: any, entry) => {
      const weekKey = entry.week_number
      if (!acc[weekKey]) {
        acc[weekKey] = {
          weekStart: entry.week_start,
          weekEnd: entry.week_end,
          weekNumber: entry.week_number,
          fixtures: [],
        }
      }

      // Convert history entry to fixture format for compatibility
      acc[weekKey].fixtures.push({
        id: entry.id,
        group_id: entry.group_id,
        week_number: entry.week_number,
        week_start: entry.week_start,
        week_end: entry.week_end,
        player_a_username: entry.player_a_username,
        player_b_username: entry.player_b_username,
        player_a_points: entry.player_a_points,
        player_b_points: entry.player_b_points,
        winner_username: entry.winner_username,
        is_bye: entry.is_bye,
        status: "closed",
        closed_at: entry.closed_at,
      })
      return acc
    }, {})

    const history = Object.values(weeklyResults)
    console.log("[v0] Processed", history.length, "weeks from history table")

    return { success: true, history }
  }

  console.log("[v0] History table not available or empty, falling back to fixtures query")

  const { data: fixtures, error: fixturesError } = await supabase
    .from("groups_rodeo_fixtures")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "closed")
    .order("week_number", { ascending: false })

  if (fixturesError) {
    console.error("[v0] Error fetching fixtures:", fixturesError)
    return { success: false, error: fixturesError.message }
  }

  console.log("[v0] Found", fixtures?.length || 0, "closed fixtures")

  if (!fixtures || fixtures.length === 0) {
    return { success: true, history: [] }
  }

  // Group fixtures by week
  const weeklyFixtures = fixtures.reduce((acc: any, fixture) => {
    const weekKey = fixture.week_number
    if (!acc[weekKey]) {
      acc[weekKey] = {
        weekStart: fixture.week_start,
        weekEnd: fixture.week_end,
        weekNumber: fixture.week_number,
        fixtures: [],
      }
    }
    acc[weekKey].fixtures.push(fixture)
    return acc
  }, {})

  const history = Object.values(weeklyFixtures)
  console.log("[v0] Processed", history.length, "weeks from fixtures")

  return { success: true, history }
}

export async function getRodeoStats(groupId: string) {
  const { data: standings } = await supabase.from("groups_rodeo_standings").select("*").eq("group_id", groupId)

  if (!standings || standings.length === 0) {
    return { success: true, stats: null }
  }

  // Calculate various stats
  const mostProteins = standings.reduce((max, s) => (s.proteins > max.proteins ? s : max))
  const bestStreak = standings.reduce((max, s) => (s.best_streak > max.best_streak ? s : max))
  const mostWins = standings.reduce((max, s) => (s.wins > max.wins ? s : max))

  // Calculate head-to-head records
  const { data: fixtures } = await supabase
    .from("groups_rodeo_fixtures")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "closed")
    .eq("is_bye", false)

  const headToHead: any = {}
  fixtures?.forEach((fixture) => {
    if (!fixture.winner_username) return

    const loser =
      fixture.winner_username === fixture.player_a_username ? fixture.player_b_username : fixture.player_a_username

    const key = [fixture.winner_username, loser].sort().join("-")
    if (!headToHead[key]) {
      headToHead[key] = {
        players: [fixture.winner_username, loser],
        wins: { [fixture.winner_username]: 0, [loser]: 0 },
      }
    }
    headToHead[key].wins[fixture.winner_username]++
  })

  // Find most dominated rival (biggest win difference)
  let mostDominated = null
  let maxDifference = 0

  Object.values(headToHead).forEach((record: any) => {
    const [p1, p2] = record.players
    const diff = Math.abs(record.wins[p1] - record.wins[p2])
    if (diff > maxDifference) {
      maxDifference = diff
      const dominator = record.wins[p1] > record.wins[p2] ? p1 : p2
      const dominated = record.wins[p1] > record.wins[p2] ? p2 : p1
      mostDominated = { dominator, dominated, wins: record.wins[dominator], losses: record.wins[dominated] }
    }
  })

  return {
    success: true,
    stats: {
      mostProteins: { username: mostProteins.player_username, count: mostProteins.proteins },
      bestStreak: { username: bestStreak.player_username, streak: bestStreak.best_streak },
      mostWins: { username: mostWins.player_username, wins: mostWins.wins },
      mostDominated,
    },
  }
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const firstMonday = getMondayOfWeek(new Date(startOfYear))
  const weeksDiff = Math.floor((date.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return weeksDiff + 1
}

// ============================================================================
// ACTIVITY REQUESTS FUNCTIONS
// ============================================================================

export async function createActivityRequest(
  username: string,
  activityId: string,
  groupId: string,
  requestType: "delete" | "edit_date",
  newDate?: string,
  reason?: string,
) {
  // Verify the activity belongs to the user
  const { data: activity, error: activityError } = await supabase
    .from("user_activities")
    .select("id, username, group_id")
    .eq("id", activityId)
    .single()

  if (activityError || !activity) {
    return { success: false, error: "Actividad no encontrada" }
  }

  if (activity.username !== username) {
    return { success: false, error: "No puedes solicitar cambios en actividades de otros usuarios" }
  }

  if (activity.group_id !== groupId) {
    return { success: false, error: "La actividad no pertenece a este grupo" }
  }

  // Create the request
  const { data, error } = await supabase
    .from("activity_requests")
    .insert({
      group_id: groupId,
      activity_id: activityId,
      requester_username: username,
      request_type: requestType,
      new_date: newDate || null,
      reason: reason || null,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating activity request:", error)
    return { success: false, error: "Error al crear la solicitud" }
  }

  revalidatePath(`/groups/${groupId}/manage`)
  return { success: true, request: data }
}

export async function getPendingRequests(username: string, groupId: string) {
  // Verify user is admin of the group
  const { data: membership } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", groupId)
    .eq("username", username)
    .single()

  if (!membership || !membership.is_admin) {
    return { success: false, error: "No tienes permisos de administrador" }
  }

  // Get pending requests with activity details
  const { data: requests, error } = await supabase
    .from("activity_requests")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching pending requests:", error)
    return { success: false, error: "Error al obtener solicitudes" }
  }

  if (!requests || requests.length === 0) {
    return { success: true, requests: [] }
  }

  // Get activity details
  const activityIds = requests.map((r) => r.activity_id)
  const { data: activities } = await supabase
    .from("user_activities")
    .select("id, minutes_performed, points_earned, completed_at, activity_id")
    .in("id", activityIds)

  const activitiesMap = new Map(activities?.map((a) => [a.id, a]) || [])

  // Get activity names
  const groupActivityIds = activities?.map((a) => a.activity_id).filter(Boolean) || []
  const { data: groupActivities } = await supabase
    .from("group_activities")
    .select("id, name")
    .in("id", groupActivityIds)

  const activityNamesMap = new Map(groupActivities?.map((a) => [a.id, a.name]) || [])

  // Get requester profiles
  const usernames = [...new Set(requests.map((r) => r.requester_username))]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username, avatar, avatar_url")
    .in("username", usernames)

  const profilesMap = new Map(profiles?.map((p) => [p.username, p]) || [])

  // Enrich requests with all details
  const enrichedRequests = requests.map((request) => {
    const activity = activitiesMap.get(request.activity_id)
    return {
      ...request,
      user_activities: activity,
      activity_name: activity ? activityNamesMap.get(activity.activity_id) : undefined,
      requester_profile: profilesMap.get(request.requester_username),
    }
  })

  return { success: true, requests: enrichedRequests }
}

export async function approveActivityRequest(username: string, requestId: string, adminNotes?: string) {
  // Get the request
  const { data: request, error: requestError } = await supabase
    .from("activity_requests")
    .select("*")
    .eq("id", requestId)
    .single()

  if (requestError || !request) {
    return { success: false, error: "Solicitud no encontrada" }
  }

  // Verify user is admin of the group
  const { data: membership } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", request.group_id)
    .eq("username", username)
    .single()

  if (!membership || !membership.is_admin) {
    return { success: false, error: "No tienes permisos de administrador" }
  }

  // Execute the requested action
  if (request.request_type === "delete") {
    const { error: deleteError } = await supabase.from("user_activities").delete().eq("id", request.activity_id)

    if (deleteError) {
      console.error("[v0] Error deleting activity:", deleteError)
      return { success: false, error: "Error al eliminar la actividad" }
    }
  } else if (request.request_type === "edit_date") {
    const { error: updateError } = await supabase
      .from("user_activities")
      .update({ completed_at: request.new_date })
      .eq("id", request.activity_id)

    if (updateError) {
      console.error("[v0] Error updating activity date:", updateError)
      return { success: false, error: "Error al actualizar la fecha de la actividad" }
    }
  }

  // Update request status
  const { error: updateRequestError } = await supabase
    .from("activity_requests")
    .update({
      status: "approved",
      reviewed_by: username,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes || null,
    })
    .eq("id", requestId)

  if (updateRequestError) {
    console.error("[v0] Error updating request status:", updateRequestError)
    return { success: false, error: "Error al actualizar el estado de la solicitud" }
  }

  revalidatePath(`/groups/${request.group_id}/manage`)
  revalidatePath(`/groups/${request.group_id}`)
  return { success: true }
}

export async function rejectActivityRequest(username: string, requestId: string, adminNotes?: string) {
  // Get the request
  const { data: request, error: requestError } = await supabase
    .from("activity_requests")
    .select("group_id")
    .eq("id", requestId)
    .single()

  if (requestError || !request) {
    return { success: false, error: "Solicitud no encontrada" }
  }

  // Verify user is admin of the group
  const { data: membership } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", request.group_id)
    .eq("username", username)
    .single()

  if (!membership || !membership.is_admin) {
    return { success: false, error: "No tienes permisos de administrador" }
  }

  // Update request status
  const { error: updateError } = await supabase
    .from("activity_requests")
    .update({
      status: "rejected",
      reviewed_by: username,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes || null,
    })
    .eq("id", requestId)

  if (updateError) {
    console.error("[v0] Error rejecting request:", updateError)
    return { success: false, error: "Error al rechazar la solicitud" }
  }

  revalidatePath(`/groups/${request.group_id}/manage`)
  return { success: true }
}

export async function deleteActivityDirectly(activityId: string, groupId: string, username: string) {
  // Verify user is admin of the group
  const { data: membership } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", groupId)
    .eq("username", username)
    .single()

  if (!membership || !membership.is_admin) {
    return { success: false, error: "No tienes permisos de administrador" }
  }

  // Delete the activity
  const { error } = await supabase.from("user_activities").delete().eq("id", activityId).eq("group_id", groupId)

  if (error) {
    console.error("[v0] Error deleting activity:", error)
    return { success: false, error: "Error al eliminar la actividad" }
  }

  revalidatePath(`/groups/${groupId}`)
  return { success: true }
}

export async function editActivityDateDirectly(activityId: string, groupId: string, username: string, newDate: string) {
  // Verify user is admin of the group
  const { data: membership } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", groupId)
    .eq("username", username)
    .single()

  if (!membership || !membership.is_admin) {
    return { success: false, error: "No tienes permisos de administrador" }
  }

  // Update the activity date
  const { error } = await supabase
    .from("user_activities")
    .update({ completed_at: newDate })
    .eq("id", activityId)
    .eq("group_id", groupId)

  if (error) {
    console.error("[v0] Error updating activity date:", error)
    return { success: false, error: "Error al actualizar la fecha de la actividad" }
  }

  revalidatePath(`/groups/${groupId}`)
  return { success: true }
}

export async function getPendingRequestsCount(username: string, groupId: string) {
  // Verify user is admin of the group
  const { data: membership } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", groupId)
    .eq("username", username)
    .single()

  if (!membership || !membership.is_admin) {
    return { success: false, count: 0 }
  }

  // Count pending requests
  const { count, error } = await supabase
    .from("activity_requests")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("status", "pending")

  if (error) {
    console.error("[v0] Error counting pending requests:", error)
    return { success: false, count: 0 }
  }

  return { success: true, count: count || 0 }
}

// ============================================================================
// NOTIFICATIONS AND ACTIVITY TAGS FUNCTIONS
// ============================================================================

export async function getUserNotifications(username: string) {
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_username", username)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[v0] Error fetching notifications:", error)
    return { success: false, error: error.message, notifications: [] }
  }

  return { success: true, notifications: notifications || [] }
}

export async function getUnreadNotificationsCount(username: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_username", username)
    .eq("is_read", false)

  if (error) {
    console.error("[v0] Error counting unread notifications:", error)
    return { success: false, count: 0 }
  }

  return { success: true, count: count || 0 }
}

export async function markNotificationAsRead(notificationId: string, username: string) {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_username", username)

  if (error) {
    console.error("[v0] Error marking notification as read:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/")
  return { success: true }
}

export async function markAllNotificationsAsRead(username: string) {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_username", username)
    .eq("is_read", false)

  if (error) {
    console.error("[v0] Error marking all notifications as read:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/")
  return { success: true }
}

export async function getPendingActivityTags(username: string) {
  console.log("[v0] getPendingActivityTags called for:", username)

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 30000))

    const fetchPromise = supabase.rpc("get_user_notifications", {
      p_username: username,
      p_notification_type: "activity_tag",
      p_is_read: false,
    })

    let result
    try {
      result = await Promise.race([fetchPromise, timeoutPromise])
    } catch (timeoutError: any) {
      console.error("[v0] Timeout or race error:", timeoutError?.message)
      // Return success with empty tags to prevent infinite retries
      return { success: true, tags: [], error: "Request timeout" }
    }

    const { data: notifications, error: notifError } = result as any

    console.log("[v0] Raw notifications query result:", {
      notifications,
      error: notifError,
      count: notifications?.length,
    })

    if (notifError) {
      console.error("[v0] Error fetching notifications:", notifError)
      return { success: true, error: notifError.message, tags: [] }
    }

    if (!notifications || !Array.isArray(notifications)) {
      console.log("[v0] No valid notifications array returned:", typeof notifications)
      return { success: true, tags: [] }
    }

    if (notifications.length === 0) {
      console.log("[v0] No pending notifications found")
      return { success: true, tags: [] }
    }

    console.log("[v0] Found", notifications.length, "pending notifications, enriching with details...")

    const enrichedTags = []

    for (const notif of notifications) {
      enrichedTags.push({
        id: notif.activity_tag_id,
        activity: {
          id: notif.activity_tag_id,
          points: 0,
        },
        group: {
          id: notif.group_id,
          name: "",
        },
        taggedBy: {
          username: notif.title?.split(" ")[0] || "Unknown",
        },
        notification: notif,
      })
    }

    console.log("[v0] Returning", enrichedTags.length, "enriched tags")
    return { success: true, tags: enrichedTags }
  } catch (err: any) {
    console.error("[v0] Error in getPendingActivityTags:", err?.message || err)
    return { success: true, tags: [], error: err?.message || "Unknown error" }
  }
}

export async function acceptActivityTag(tagId: string, username: string) {
  console.log("[v0] acceptActivityTag called with:", { tagId, username })

  try {
    const { data: tagData, error: tagError } = await supabase.rpc("accept_activity_tag", {
      p_tag_id: tagId,
      p_username: username,
    })

    if (tagError || !tagData || tagData.length === 0) {
      console.error("[v0] Error fetching activity tag:", tagError)
      return { success: false, error: "Etiqueta no encontrada o ya procesada" }
    }

    const tag = tagData[0].tag_data
    const originalActivity = tagData[0].original_activity_data

    console.log("[v0] Tag and activity found, creating new activity for user")

    // Create a new activity for the tagged user with the same details
    const { data: newActivity, error: insertError } = await supabase
      .from("user_activities")
      .insert({
        username: username,
        group_id: tag.group_id,
        activity_id: originalActivity.activity_id,
        points_earned: originalActivity.points_earned,
        minutes_performed: originalActivity.minutes_performed,
        completed_at: originalActivity.completed_at,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error creating activity for tagged user:", insertError)
      return { success: false, error: "Error al crear la actividad" }
    }

    console.log("[v0] Activity created, updating tag status")

    const { error: updateError } = await supabase.rpc("update_activity_tag_status", {
      p_tag_id: tagId,
      p_status: "accepted",
    })

    if (updateError) {
      console.error("[v0] Error updating tag status:", updateError)
      return { success: false, error: "Error al actualizar el estado" }
    }

    // Check for achievements
    try {
      const { checkAndAwardAchievements } = await import("./achievements")
      await checkAndAwardAchievements(username, tag.group_id)
    } catch (error) {
      console.error("Error checking achievements:", error)
    }

    revalidatePath("/")
    console.log("[v0] Activity tag accepted successfully")
    return { success: true, activity: newActivity }
  } catch (error: any) {
    console.error("[v0] Error in acceptActivityTag:", error)
    return { success: false, error: error.message || "Error al aceptar la actividad" }
  }
}

export async function rejectActivityTag(tagId: string, username: string, reason?: string) {
  console.log("[v0] rejectActivityTag called with:", { tagId, username, reason })

  try {
    const { error: updateError } = await supabase.rpc("update_activity_tag_status", {
      p_tag_id: tagId,
      p_status: "rejected",
      p_reason: reason,
    })

    if (updateError) {
      console.error("[v0] Error updating tag status:", updateError)
      return { success: false, error: "Error al rechazar la actividad" }
    }

    revalidatePath("/")
    console.log("[v0] Activity tag rejected successfully")
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Error in rejectActivityTag:", error)
    return { success: false, error: error.message || "Error al rechazar la actividad" }
  }
}

export async function getActivityTagsForActivity(activityId: string) {
  const { data: tags, error } = await supabase
    .from("activity_tags")
    .select(`
      *,
      profiles:tagged_user (username, avatar, avatar_url)
    `)
    .eq("activity_id", activityId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching activity tags:", error)
    return { success: false, error: error.message, tags: [] }
  }

  return { success: true, tags: tags || [] }
}

export async function getGroupWeeklyRecords(groupId: string) {
  try {
    const { data: records, error } = await supabase.rpc("get_group_weekly_records", {
      p_group_id: groupId,
    })

    if (error) {
      console.error("[v0] Error fetching weekly records:", error)
      return []
    }

    return records || []
  } catch (error) {
    console.error("[v0] Error in getGroupWeeklyRecords:", error)
    return []
  }
}

// ============================================
// BROADCAST NOTIFICATIONS (ADMIN ONLY)
// ============================================

export async function sendBroadcastNotification(adminUsername: string, message: string, title?: string) {
  console.log("[v0] sendBroadcastNotification called by:", adminUsername)

  if (adminUsername !== "Santi") {
    console.error("[v0] Unauthorized broadcast attempt by:", adminUsername)
    return { success: false, error: "No autorizado" }
  }

  if (!message || message.trim().length === 0) {
    return { success: false, error: "El mensaje no puede estar vacío" }
  }

  try {
    // Get all users who have the app (have a profile)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("username")
      .order("username")

    if (profilesError) {
      console.error("[v0] Error fetching profiles:", profilesError)
      return { success: false, error: "Error al obtener usuarios" }
    }

    if (!profiles || profiles.length === 0) {
      return { success: false, error: "No hay usuarios para notificar" }
    }

    console.log(`[v0] Found ${profiles.length} users to notify`)

    // Return the data needed for client-side notification sending
    // (Service workers can only be triggered from client-side)
    return {
      success: true,
      userCount: profiles.length,
      users: profiles.map((p) => p.username),
      notification: {
        title: title || "🐂 Road To Toro",
        message: message.trim(),
      },
    }
  } catch (error: any) {
    console.error("[v0] Error in sendBroadcastNotification:", error)
    return { success: false, error: error.message || "Error al enviar notificaciones" }
  }
}

// ============================================
// SYNC RODEO HISTORY FUNCTION
// ============================================

export async function syncRodeoHistory(groupId: string) {
  console.log("[v0] syncRodeoHistory called for group:", groupId)

  const { data, error } = await supabase.rpc("sync_rodeo_history_from_fixtures", {
    p_group_id: groupId,
  })

  if (error) {
    console.error("[v0] Error calling sync RPC:", error)
    return { success: false, error: "Error al sincronizar historial" }
  }

  if (!data || data.length === 0) {
    return { success: false, error: "Error al ejecutar sincronización" }
  }

  const result = data[0]

  if (result.error_message) {
    console.error("[v0] Sync error:", result.error_message)
    return { success: false, error: result.error_message }
  }

  console.log(`[v0] Successfully synced ${result.synced_count} fixtures`)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/rodeos`)

  if (result.synced_count === 0) {
    return { success: true, message: "Historial ya está sincronizado", synced: 0 }
  }

  return {
    success: true,
    message: `Se sincronizaron ${result.synced_count} partidos al historial`,
    synced: result.synced_count,
  }
}
