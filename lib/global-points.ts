/**
 * Ranking global: rangos y presentación.
 *
 * Módulo PURO (como `lib/points.ts`, `lib/report-verdict.ts` y `lib/sport-icons.ts`):
 * lo importan tanto componentes cliente como `lib/actions.ts` ("use server", que
 * no puede exportar helpers sync).
 *
 * OJO — dos escalas distintas que NO se mezclan:
 *
 *   1. Puntos del grupo    -> group_activities.points / points_per_minute,
 *                             los define el admin de cada grupo y los calcula
 *                             logActivity. Alimentan el ranking del grupo y los
 *                             rodeos. Esto NO se tocó.
 *
 *   2. Puntos globales     -> activity_relations.global_points, iguales para
 *                             todos. Alimentan solo el ranking global, para que
 *                             "Gym a 100 pts" en un grupo y "Gimnasio a 50 pts"
 *                             en otro pesen lo mismo entre grupos.
 *
 * El puntaje global de un registro sale del RPC get_global_ranking (script 46),
 * que resuelve la relación en este orden: user_activities.sport_icon ->
 * activity_relations.sport_key, y si no, group_activities.relation_id.
 */

export type GlobalRankingRow = {
  username: string
  globalPoints: number
  activities: number
  sports: number
  lastActivity: string | null
  /** Posición 1-based, ya calculada por el server. */
  position: number
  avatar?: string | null
}

export type SportBreakdownRow = {
  relationId: number
  name: string
  icon: string | null
  unitPoints: number
  activities: number
  totalPoints: number
}

export type GlobalPeriod = "week" | "month" | "year" | "all"

export const GLOBAL_PERIOD_LABEL: Record<GlobalPeriod, string> = {
  week: "Semana",
  month: "Mes",
  year: "Año",
  all: "Histórico",
}

export const GLOBAL_PERIODS: GlobalPeriod[] = ["week", "month", "year", "all"]

// ---------------------------------------------------------------------------
// Rangos
//
// Se calculan sobre los puntos del período que se está mirando, así que en
// "Semana" arrancan todos de cero y hay algo que ganar cada lunes. No hay estado
// guardado en la DB: es una función pura de los puntos, no un ascenso/descenso
// persistido (eso sería otra feature, con su propia tabla).
// ---------------------------------------------------------------------------

export type Rank = {
  key: string
  label: string
  emoji: string
  /** Puntos mínimos para entrar al rango. */
  min: number
  /** Clases Tailwind ya resueltas, para no repetir el switch en cada componente. */
  text: string
  bg: string
  ring: string
  gradient: string
}

export const RANKS: Rank[] = [
  {
    key: "ternero",
    label: "Ternero",
    emoji: "🐮",
    min: 0,
    text: "text-stone-600",
    bg: "bg-stone-100",
    ring: "ring-stone-300",
    gradient: "from-stone-300 to-stone-400",
  },
  {
    key: "novillo",
    label: "Novillo",
    emoji: "🐂",
    min: 500,
    text: "text-amber-700",
    bg: "bg-amber-100",
    ring: "ring-amber-300",
    gradient: "from-amber-300 to-amber-500",
  },
  {
    key: "toro",
    label: "Toro",
    emoji: "🔥",
    min: 1500,
    text: "text-toro-primary",
    bg: "bg-toro-primary/10",
    ring: "ring-toro-primary/40",
    gradient: "from-toro-primary to-orange-500",
  },
  {
    key: "toro-de-oro",
    label: "Toro de Oro",
    emoji: "👑",
    min: 3000,
    text: "text-yellow-600",
    bg: "bg-yellow-100",
    ring: "ring-yellow-400",
    gradient: "from-yellow-400 via-amber-400 to-yellow-500",
  },
]

export function getRank(points: number): Rank {
  let current = RANKS[0]
  for (const r of RANKS) {
    if (points >= r.min) current = r
  }
  return current
}

export function getNextRank(points: number): Rank | null {
  return RANKS.find((r) => r.min > points) ?? null
}

/** Progreso 0..1 dentro del rango actual (1 si ya está en el último). */
export function rankProgress(points: number): number {
  const current = getRank(points)
  const next = getNextRank(points)
  if (!next) return 1
  const span = next.min - current.min
  if (span <= 0) return 1
  return Math.min(1, Math.max(0, (points - current.min) / span))
}

/** Puntos que faltan para el próximo rango (null si ya está en el último). */
export function pointsToNextRank(points: number): number | null {
  const next = getNextRank(points)
  return next ? Math.max(0, next.min - points) : null
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

/** 12345 -> "12.345" (separador de miles con punto, como se escribe en es-AR). */
export function formatPoints(n: number): string {
  return new Intl.NumberFormat("es-AR").format(Math.round(n))
}

/** Medalla para el podio; del 4º en adelante, el número. */
export function positionLabel(position: number): string {
  if (position === 1) return "🥇"
  if (position === 2) return "🥈"
  if (position === 3) return "🥉"
  return String(position)
}
