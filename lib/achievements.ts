import { supabase } from "./supabase"

export type AchievementType = "basic" | "intermediate" | "hard" | "impossible"

export interface Achievement {
  key: string
  name: string
  description: string
  type: AchievementType
  icon: string
  activityId?: string
  activityName?: string
}

export interface UserAchievement {
  id: string
  username: string
  group_id: string
  achievement_type: AchievementType
  achievement_key: string
  achievement_name: string
  achievement_description: string
  activity_id?: string
  completed_at: string
}

// Generate all possible achievements for a group
export async function generateGroupAchievements(groupId: string): Promise<Achievement[]> {
  const achievements: Achievement[] = []

  // Get group activities
  const { data: activities } = await supabase.from("group_activities").select("*").eq("group_id", groupId)

  // Basic achievements
  achievements.push(
    {
      key: "first_activity",
      name: "Primer Paso",
      description: "Registra tu primera actividad",
      type: "basic",
      icon: "🎯",
    },
    {
      key: "first_weight",
      name: "En la Balanza",
      description: "Completa tu primer registro de peso",
      type: "basic",
      icon: "⚖️",
    },
    {
      key: "first_photo",
      name: "Sonríe",
      description: "Sube tu primera foto",
      type: "basic",
      icon: "📸",
    },
  )

  // Basic: First time each activity
  activities?.forEach((activity) => {
    achievements.push({
      key: `first_${activity.id}`,
      name: `Primer ${activity.name}`,
      description: `Completa tu primera sesión de ${activity.name}`,
      type: "basic",
      icon: "🥉",
      activityId: activity.id,
      activityName: activity.name,
    })
  })

  // Intermediate achievements
  achievements.push(
    {
      key: "100_total_activities",
      name: "Centurión",
      description: "Completa 100 actividades en total",
      type: "intermediate",
      icon: "💯",
    },
    {
      key: "5_weight_reports",
      name: "Constante",
      description: "Sube 5 reportes de peso",
      type: "intermediate",
      icon: "📊",
    },
    {
      key: "5_photos",
      name: "Fotógrafo",
      description: "Sube 5 fotos",
      type: "intermediate",
      icon: "📷",
    },
  )

  // Intermediate: 20 of each activity + 3 consecutive days
  activities?.forEach((activity) => {
    achievements.push(
      {
        key: `20_${activity.id}`,
        name: `${activity.name} Veterano`,
        description: `Completa 20 sesiones de ${activity.name}`,
        type: "intermediate",
        icon: "🥈",
        activityId: activity.id,
        activityName: activity.name,
      },
      {
        key: `3_days_${activity.id}`,
        name: `${activity.name} Constante`,
        description: `Haz ${activity.name} 3 días seguidos en una semana`,
        type: "intermediate",
        icon: "🔥",
        activityId: activity.id,
        activityName: activity.name,
      },
    )
  })

  // Hard achievements
  achievements.push(
    {
      key: "weekly_champion",
      name: "Toro de la Semana",
      description: "Sé el campeón de una semana",
      type: "hard",
      icon: "👑",
    },
    {
      key: "1000_total_activities",
      name: "Máquina",
      description: "Completa 1000 actividades en total",
      type: "hard",
      icon: "🚀",
    },
    {
      key: "20_weight_reports",
      name: "Disciplinado",
      description: "Sube 20 reportes de peso",
      type: "hard",
      icon: "📈",
    },
    {
      key: "20_photos",
      name: "Modelo",
      description: "Sube 20 fotos",
      type: "hard",
      icon: "🌟",
    },
  )

  // Hard: 100 of each activity + 5 consecutive days
  activities?.forEach((activity) => {
    achievements.push(
      {
        key: `100_${activity.id}`,
        name: `${activity.name} Maestro`,
        description: `Completa 100 sesiones de ${activity.name}`,
        type: "hard",
        icon: "🥇",
        activityId: activity.id,
        activityName: activity.name,
      },
      {
        key: `5_days_${activity.id}`,
        name: `${activity.name} Adicto`,
        description: `Haz ${activity.name} 5 días seguidos en una semana`,
        type: "hard",
        icon: "⚡",
        activityId: activity.id,
        activityName: activity.name,
      },
    )
  })

  // Impossible achievements
  achievements.push(
    {
      key: "5_weekly_wins",
      name: "Toro Supremo",
      description: "Sé el toro de la semana más de 5 veces",
      type: "impossible",
      icon: "🏆",
    },
    {
      key: "5000_total_activities",
      name: "Leyenda",
      description: "Completa 5000 actividades en total",
      type: "impossible",
      icon: "🌟",
    },
    {
      key: "100_weight_reports",
      name: "Científico",
      description: "Sube 100 reportes de peso",
      type: "impossible",
      icon: "🔬",
    },
    {
      key: "100_photos",
      name: "Influencer",
      description: "Sube 100 fotos",
      type: "impossible",
      icon: "💎",
    },
  )

  // Impossible: 300 of each activity + 7 consecutive days
  activities?.forEach((activity) => {
    achievements.push(
      {
        key: `300_${activity.id}`,
        name: `${activity.name} Dios`,
        description: `Completa 300 sesiones de ${activity.name}`,
        type: "impossible",
        icon: "👑",
        activityId: activity.id,
        activityName: activity.name,
      },
      {
        key: `7_days_${activity.id}`,
        name: `${activity.name} Obsesivo`,
        description: `Haz ${activity.name} todos los días de una semana`,
        type: "impossible",
        icon: "🔥",
        activityId: activity.id,
        activityName: activity.name,
      },
    )
  })

  return achievements
}

// Check if user has completed an achievement
export async function checkAchievement(username: string, groupId: string, achievement: Achievement): Promise<boolean> {
  const { key, activityId } = achievement

  try {
    // Check basic achievements
    if (key === "first_activity") {
      const { data } = await supabase.rpc("check_first_activity_achievement", {
        p_username: username,
        p_group_id: groupId,
      })
      return data === true
    }

    if (key === "first_weight") {
      const { data } = await supabase.rpc("check_first_weight_achievement", {
        p_username: username,
        p_group_id: groupId,
      })
      return data === true
    }

    if (key === "first_photo") {
      const { data } = await supabase.rpc("check_first_photo_achievement", {
        p_username: username,
        p_group_id: groupId,
      })
      return data === true
    }

    // First time specific activity
    if (key.startsWith("first_") && activityId) {
      const { data } = await supabase.rpc("get_activity_count", {
        p_username: username,
        p_group_id: groupId,
        p_activity_id: activityId,
      })
      return data >= 1
    }

    // Activity count achievements
    if (key.startsWith("20_") && activityId) {
      const { data } = await supabase.rpc("get_activity_count", {
        p_username: username,
        p_group_id: groupId,
        p_activity_id: activityId,
      })
      return data >= 20
    }

    if (key.startsWith("100_") && activityId) {
      const { data } = await supabase.rpc("get_activity_count", {
        p_username: username,
        p_group_id: groupId,
        p_activity_id: activityId,
      })
      return data >= 100
    }

    if (key.startsWith("300_") && activityId) {
      const { data } = await supabase.rpc("get_activity_count", {
        p_username: username,
        p_group_id: groupId,
        p_activity_id: activityId,
      })
      return data >= 300
    }

    // Consecutive days achievements
    if (key.startsWith("3_days_") && activityId) {
      const { data } = await supabase.rpc("check_consecutive_days_activity", {
        p_username: username,
        p_group_id: groupId,
        p_activity_id: activityId,
        p_days: 3,
      })
      return data === true
    }

    if (key.startsWith("5_days_") && activityId) {
      const { data } = await supabase.rpc("check_consecutive_days_activity", {
        p_username: username,
        p_group_id: groupId,
        p_activity_id: activityId,
        p_days: 5,
      })
      return data === true
    }

    if (key.startsWith("7_days_") && activityId) {
      const { data } = await supabase.rpc("check_consecutive_days_activity", {
        p_username: username,
        p_group_id: groupId,
        p_activity_id: activityId,
        p_days: 7,
      })
      return data === true
    }

    // Total activity achievements
    if (key === "100_total_activities") {
      const { data } = await supabase.rpc("get_total_activity_count", {
        p_username: username,
        p_group_id: groupId,
      })
      return data >= 100
    }

    if (key === "1000_total_activities") {
      const { data } = await supabase.rpc("get_total_activity_count", {
        p_username: username,
        p_group_id: groupId,
      })
      return data >= 1000
    }

    if (key === "5000_total_activities") {
      const { data } = await supabase.rpc("get_total_activity_count", {
        p_username: username,
        p_group_id: groupId,
      })
      return data >= 5000
    }

    // Weight reports achievements
    if (key === "5_weight_reports" || key === "20_weight_reports" || key === "100_weight_reports") {
      const target = key === "5_weight_reports" ? 5 : key === "20_weight_reports" ? 20 : 100
      const { data } = await supabase
        .from("bi_weekly_reports")
        .select("id", { count: "exact" })
        .eq("username", username)
        .eq("group_id", groupId)

      return (data?.length || 0) >= target
    }

    // Photos achievements
    if (key === "5_photos" || key === "20_photos" || key === "100_photos") {
      const target = key === "5_photos" ? 5 : key === "20_photos" ? 20 : 100
      const { data } = await supabase
        .from("bi_weekly_reports")
        .select("id", { count: "exact" })
        .eq("username", username)
        .eq("group_id", groupId)
        .not("scale_photo_url", "is", null)
        .not("body_photo_url", "is", null)

      return (data?.length || 0) >= target
    }

    // Weekly wins achievements
    if (key === "weekly_champion" || key === "5_weekly_wins") {
      const { data } = await supabase.rpc("count_weekly_wins", {
        p_username: username,
        p_group_id: groupId,
      })
      return key === "weekly_champion" ? data >= 1 : data >= 5
    }

    return false
  } catch (error) {
    console.error("Error checking achievement:", error)
    return false
  }
}

// Get user's completed achievements for a group
export async function getUserAchievements(username: string, groupId: string): Promise<UserAchievement[]> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("username", username)
    .eq("group_id", groupId)

  if (error) {
    console.error("Error getting user achievements:", error)
    return []
  }

  return data || []
}

// Award achievement to user
export async function awardAchievement(username: string, groupId: string, achievement: Achievement): Promise<boolean> {
  try {
    const { error } = await supabase.from("user_achievements").insert({
      username,
      group_id: groupId,
      achievement_type: achievement.type,
      achievement_key: achievement.key,
      achievement_name: achievement.name,
      achievement_description: achievement.description,
      activity_id: achievement.activityId || null,
    })

    return !error
  } catch (error) {
    console.error("Error awarding achievement:", error)
    return false
  }
}

// Check and award new achievements for user
export async function checkAndAwardAchievements(username: string, groupId: string): Promise<Achievement[]> {
  const newAchievements: Achievement[] = []

  try {
    // Get all possible achievements for this group
    const allAchievements = await generateGroupAchievements(groupId)

    // Get user's current achievements
    const userAchievements = await getUserAchievements(username, groupId)
    const completedKeys = new Set(userAchievements.map((ua) => ua.achievement_key))

    // Check each achievement
    for (const achievement of allAchievements) {
      // Skip if already completed
      if (completedKeys.has(achievement.key)) continue

      // Check if user has completed this achievement
      const isCompleted = await checkAchievement(username, groupId, achievement)

      if (isCompleted) {
        // Award the achievement
        const awarded = await awardAchievement(username, groupId, achievement)
        if (awarded) {
          newAchievements.push(achievement)
        }
      }
    }

    return newAchievements
  } catch (error) {
    console.error("Error checking and awarding achievements:", error)
    return []
  }
}
