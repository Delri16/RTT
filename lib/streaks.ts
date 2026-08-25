/**
 * Rachas de actividad.
 *
 * Módulo PURO (mismo criterio que `lib/points.ts` y `lib/global-points.ts`):
 * recibe la lista de días activos y devuelve los números. No consulta nada.
 *
 * Un día "cuenta" si tuvo al menos una actividad registrada. Los días se agrupan
 * en HORA ARGENTINA, no en la del navegador — el RPC get_user_active_days
 * (script 46) ya devuelve las fechas convertidas, y acá se comparan como claves
 * "YYYY-MM-DD" para no volver a pasar por Date y arrastrar zonas horarias.
 *
 * La racha es estricta a propósito: no hay "perdón" automático. Lo que sí hay es
 * el estado `atRisk`, que marca cuando la racha sigue viva pero hoy todavía no
 * se registró nada — es el momento en que la UI tiene que empujar.
 */

export type StreakInfo = {
  /** Días consecutivos hasta hoy (o hasta ayer, si hoy todavía no registró). */
  current: number
  /** La racha más larga de la historia. */
  longest: number
  /** La racha sigue viva pero hoy no hay actividad todavía. */
  atRisk: boolean
  /** Hoy ya tiene al menos una actividad. */
  activeToday: boolean
  /** Días con actividad en la semana en curso (lunes a domingo). */
  daysThisWeek: number
  /** Un booleano por día de la semana en curso, de lunes a domingo. */
  weekDays: boolean[]
  /** Índice 0..6 del día de hoy dentro de weekDays (0 = lunes). */
  todayIndex: number
  /** Total histórico de días con actividad. */
  totalActiveDays: number
}

export const EMPTY_STREAK: StreakInfo = {
  current: 0,
  longest: 0,
  atRisk: false,
  activeToday: false,
  daysThisWeek: 0,
  weekDays: [false, false, false, false, false, false, false],
  todayIndex: 0,
  totalActiveDays: 0,
}

/** Etiquetas de los días, de lunes a domingo (como se dibuja la semana en la app). */
export const WEEK_DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"]

const DAY_MS = 24 * 60 * 60 * 1000

/** "YYYY-MM-DD" -> Date en UTC a medianoche, para restar días sin líos de zona. */
function keyToUtc(key: string): number {
  const [y, m, d] = key.split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

function utcToKey(ms: number): string {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Calcula la racha.
 *
 * @param activeDays claves "YYYY-MM-DD" de los días con actividad (en cualquier orden)
 * @param todayKey   clave del día de hoy EN HORA ARGENTINA (argDayKey(new Date()))
 */
export function computeStreak(activeDays: string[], todayKey: string): StreakInfo {
  if (activeDays.length === 0) return EMPTY_STREAK

  const set = new Set(activeDays)
  const sorted = [...set].sort() // ascendente

  // --- racha más larga (histórica) ---
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = keyToUtc(sorted[i - 1])
    const cur = keyToUtc(sorted[i])
    if (cur - prev === DAY_MS) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  // --- racha actual ---
  const todayMs = keyToUtc(todayKey)
  const activeToday = set.has(todayKey)
  const activeYesterday = set.has(utcToKey(todayMs - DAY_MS))

  let current = 0
  if (activeToday || activeYesterday) {
    // Si hoy todavía no registró, la racha se cuenta desde ayer: sigue viva
    // hasta que termine el día.
    let cursor = activeToday ? todayMs : todayMs - DAY_MS
    while (set.has(utcToKey(cursor))) {
      current++
      cursor -= DAY_MS
    }
  }

  // --- días de la semana en curso (lunes a domingo) ---
  const todayDate = new Date(todayMs)
  // getUTCDay: domingo=0. Se corre para que lunes sea 0.
  const offsetToMonday = (todayDate.getUTCDay() + 6) % 7
  const mondayMs = todayMs - offsetToMonday * DAY_MS
  const weekDays: boolean[] = []
  for (let i = 0; i < 7; i++) {
    weekDays.push(set.has(utcToKey(mondayMs + i * DAY_MS)))
  }

  return {
    current,
    longest: Math.max(longest, current),
    atRisk: current > 0 && !activeToday,
    activeToday,
    daysThisWeek: weekDays.filter(Boolean).length,
    weekDays,
    todayIndex: offsetToMonday,
    totalActiveDays: set.size,
  }
}

/**
 * Mensaje corto para la UI. Cambia de tono según el estado, con la misma voz
 * exagerada que usa el veredicto del reporte (`lib/report-verdict.ts`).
 */
export function streakMessage(streak: StreakInfo): string {
  if (streak.current === 0) {
    return streak.totalActiveDays > 0 ? "Se te cortó la racha. Arrancá de nuevo hoy." : "Registrá algo y arrancá tu racha."
  }
  if (streak.atRisk) {
    if (streak.current >= 7) return `${streak.current} días en juego. Hoy todavía no hiciste nada.`
    return "Tu racha está en riesgo. Movete hoy."
  }
  if (streak.current >= 30) return "Un mes sin fallar. Sos otra cosa."
  if (streak.current >= 14) return "Dos semanas seguidas. Imparable."
  if (streak.current >= 7) return "Una semana entera. Así se hace."
  if (streak.current >= 3) return "Tres días al hilo. No la cortes."
  return "Arrancó la racha. Seguí mañana."
}

/** Emoji que escala con la racha, para el chip del feed. */
export function streakEmoji(streak: StreakInfo): string {
  if (streak.current === 0) return "💤"
  if (streak.atRisk) return "⏳"
  if (streak.current >= 30) return "👑"
  if (streak.current >= 14) return "⚡"
  if (streak.current >= 7) return "🔥"
  return "✨"
}
