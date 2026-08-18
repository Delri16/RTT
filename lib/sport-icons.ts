/**
 * Catálogo de íconos de deporte (emoji) para las actividades.
 *
 * Módulo PURO (como `lib/points.ts` y `lib/report-verdict.ts`): se importa tanto
 * desde componentes cliente como desde `lib/actions.ts` ("use server", que no
 * puede exportar helpers sync).
 *
 * Se usan emoji y no una librería de íconos SVG a propósito: lucide-react (la
 * única librería de íconos del proyecto) no tiene fútbol, tenis, pádel, boxeo,
 * surf ni la mayoría de los deportes — solo `dumbbell`, `bike`, `volleyball` y
 * poco más. Los emoji cubren ~50 deportes, pesan 0 en el bundle y se ven bien en
 * los tamaños chiquitos del calendario (mismo criterio que los avatares).
 *
 * El ícono es SOLO informativo: no toca puntos, ranking ni nada del cálculo.
 */

export type SportIcon = {
  /** Id estable que se guarda en la DB (no cambiar: rompe los registros viejos). */
  id: string
  label: string
  emoji: string
  category: SportCategory
  /** Términos extra para la búsqueda del selector. */
  keywords?: string[]
}

export type SportCategory = "pelota" | "raqueta" | "agua" | "aire-libre" | "gimnasio" | "combate" | "invierno" | "otros"

export const SPORT_CATEGORY_LABEL: Record<SportCategory, string> = {
  pelota: "Con pelota",
  raqueta: "Raqueta / paleta",
  agua: "Agua",
  "aire-libre": "Aire libre",
  gimnasio: "Gimnasio / fitness",
  combate: "Combate",
  invierno: "Invierno",
  otros: "Otros",
}

export const SPORT_CATEGORY_ORDER: SportCategory[] = [
  "pelota",
  "raqueta",
  "agua",
  "aire-libre",
  "gimnasio",
  "combate",
  "invierno",
  "otros",
]

export const SPORT_ICONS: SportIcon[] = [
  // Con pelota
  { id: "futbol", label: "Fútbol", emoji: "⚽", category: "pelota", keywords: ["soccer", "futsal", "f5", "picadito"] },
  { id: "basquet", label: "Básquet", emoji: "🏀", category: "pelota", keywords: ["basketball", "basquetbol"] },
  { id: "voley", label: "Vóley", emoji: "🏐", category: "pelota", keywords: ["volley", "voleibol", "beach volley"] },
  { id: "handball", label: "Handball", emoji: "🤾", category: "pelota", keywords: ["balonmano"] },
  { id: "rugby", label: "Rugby", emoji: "🏉", category: "pelota", keywords: [] },
  { id: "futbol-americano", label: "Fútbol americano", emoji: "🏈", category: "pelota", keywords: ["nfl"] },
  { id: "beisbol", label: "Béisbol", emoji: "⚾", category: "pelota", keywords: ["baseball", "softbol"] },
  { id: "hockey", label: "Hockey", emoji: "🏑", category: "pelota", keywords: ["cesped"] },
  { id: "golf", label: "Golf", emoji: "⛳", category: "pelota", keywords: [] },
  { id: "bowling", label: "Bowling", emoji: "🎳", category: "pelota", keywords: ["bochas", "bowls"] },

  // Raqueta / paleta
  { id: "tenis", label: "Tenis", emoji: "🎾", category: "raqueta", keywords: [] },
  { id: "padel", label: "Pádel", emoji: "🥎", category: "raqueta", keywords: ["paddle", "padle"] },
  { id: "ping-pong", label: "Ping pong", emoji: "🏓", category: "raqueta", keywords: ["tenis de mesa"] },
  { id: "badminton", label: "Bádminton", emoji: "🏸", category: "raqueta", keywords: [] },
  // Unicode no tiene emoji propio de squash: comparte la pelotita de tenis, el label distingue.
  { id: "squash", label: "Squash", emoji: "🎾", category: "raqueta", keywords: [] },

  // Agua
  { id: "natacion", label: "Natación", emoji: "🏊", category: "agua", keywords: ["pileta", "nadar", "swim"] },
  { id: "surf", label: "Surf", emoji: "🏄", category: "agua", keywords: ["olas", "bodyboard"] },
  { id: "wakeboard", label: "Wakeboard", emoji: "🚤", category: "agua", keywords: ["esqui acuatico", "wake"] },
  { id: "kitesurf", label: "Kitesurf", emoji: "🪁", category: "agua", keywords: ["kite", "windsurf"] },
  { id: "kayak", label: "Kayak", emoji: "🛶", category: "agua", keywords: ["canoa", "canotaje", "sup"] },
  { id: "remo", label: "Remo", emoji: "🚣", category: "agua", keywords: ["rowing"] },
  { id: "waterpolo", label: "Waterpolo", emoji: "🤽", category: "agua", keywords: ["polo acuatico"] },
  { id: "buceo", label: "Buceo", emoji: "🤿", category: "agua", keywords: ["snorkel", "apnea"] },
  { id: "vela", label: "Vela", emoji: "⛵", category: "agua", keywords: ["nautica", "velero"] },

  // Aire libre
  { id: "running", label: "Running", emoji: "🏃", category: "aire-libre", keywords: ["correr", "trote", "maraton"] },
  { id: "caminata", label: "Caminata", emoji: "🚶", category: "aire-libre", keywords: ["caminar", "pasos", "walk"] },
  { id: "trekking", label: "Trekking", emoji: "🥾", category: "aire-libre", keywords: ["senderismo", "hiking", "montaña"] },
  { id: "ciclismo", label: "Ciclismo", emoji: "🚴", category: "aire-libre", keywords: ["bici", "bicicleta", "bike"] },
  { id: "mountain-bike", label: "Mountain bike", emoji: "🚵", category: "aire-libre", keywords: ["mtb", "bici montaña"] },
  { id: "escalada", label: "Escalada", emoji: "🧗", category: "aire-libre", keywords: ["boulder", "climbing"] },
  { id: "patin", label: "Patín", emoji: "🛼", category: "aire-libre", keywords: ["rollers", "patinaje"] },
  { id: "skate", label: "Skate", emoji: "🛹", category: "aire-libre", keywords: ["skateboard", "monopatin"] },
  { id: "equitacion", label: "Equitación", emoji: "🏇", category: "aire-libre", keywords: ["caballo", "hipica"] },
  { id: "parapente", label: "Parapente", emoji: "🪂", category: "aire-libre", keywords: ["paracaidismo"] },

  // Gimnasio / fitness
  { id: "gym", label: "Gimnasio", emoji: "🏋️", category: "gimnasio", keywords: ["pesas", "musculacion", "fierros"] },
  { id: "funcional", label: "Funcional", emoji: "💪", category: "gimnasio", keywords: ["hiit", "entrenamiento"] },
  { id: "crossfit", label: "Crossfit", emoji: "🤸", category: "gimnasio", keywords: ["wod", "gimnasia"] },
  { id: "yoga", label: "Yoga", emoji: "🧘", category: "gimnasio", keywords: ["meditacion", "stretching", "elongar"] },
  { id: "pilates", label: "Pilates", emoji: "🧘‍♀️", category: "gimnasio", keywords: ["reformer"] },
  { id: "spinning", label: "Spinning", emoji: "🚲", category: "gimnasio", keywords: ["indoor cycling", "bici fija"] },
  { id: "cardio", label: "Cardio", emoji: "❤️‍🔥", category: "gimnasio", keywords: ["cinta", "eliptico", "aerobico"] },
  { id: "baile", label: "Baile", emoji: "💃", category: "gimnasio", keywords: ["zumba", "dance", "ritmos"] },

  // Combate
  { id: "boxeo", label: "Boxeo", emoji: "🥊", category: "combate", keywords: ["box", "kickboxing", "muay thai"] },
  { id: "artes-marciales", label: "Artes marciales", emoji: "🥋", category: "combate", keywords: ["karate", "judo", "taekwondo", "jiu jitsu"] },
  { id: "lucha", label: "Lucha", emoji: "🤼", category: "combate", keywords: ["wrestling", "grappling"] },
  { id: "esgrima", label: "Esgrima", emoji: "🤺", category: "combate", keywords: ["florete"] },

  // Invierno
  { id: "ski", label: "Ski", emoji: "🎿", category: "invierno", keywords: ["esqui", "nieve"] },
  { id: "snowboard", label: "Snowboard", emoji: "🏂", category: "invierno", keywords: ["nieve", "snow"] },
  { id: "patinaje-hielo", label: "Patinaje sobre hielo", emoji: "⛸️", category: "invierno", keywords: ["hielo"] },
  { id: "hockey-hielo", label: "Hockey sobre hielo", emoji: "🏒", category: "invierno", keywords: ["hielo"] },

  // Otros
  { id: "tiro-con-arco", label: "Tiro con arco", emoji: "🏹", category: "otros", keywords: ["arqueria"] },
  { id: "pesca", label: "Pesca", emoji: "🎣", category: "otros", keywords: [] },
  { id: "automovilismo", label: "Automovilismo", emoji: "🏎️", category: "otros", keywords: ["karting", "motociclismo"] },
  { id: "otro-deporte", label: "Otro deporte", emoji: "🏆", category: "otros", keywords: ["varios", "generico"] },
]

const BY_ID = new Map(SPORT_ICONS.map((s) => [s.id, s]))

export function getSportIcon(id?: string | null): SportIcon | null {
  if (!id) return null
  return BY_ID.get(id) ?? null
}

/** Emoji de un id de deporte (null si el id no existe o no hay ícono elegido). */
export function sportEmoji(id?: string | null): string | null {
  return getSportIcon(id)?.emoji ?? null
}

export function sportLabel(id?: string | null): string | null {
  return getSportIcon(id)?.label ?? null
}

/**
 * Emoji a mostrar para un registro de actividad: manda el que eligió la persona
 * al registrar (actividades "Otros"), y si no hay, el ícono fijo de la actividad
 * del grupo.
 */
export function resolveActivityEmoji(sportIconId?: string | null, activityIconId?: string | null): string | null {
  return sportEmoji(sportIconId) ?? sportEmoji(activityIconId)
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

const OTHER_WORDS = new Set(["otro", "otra", "otros", "otras"])

/**
 * ¿La actividad del grupo es la genérica "Otros"? (no distingue mayúsculas ni
 * acentos, y matchea también "Otros deportes" / "Otra actividad").
 *
 * Cuando da true, al registrarla hay que elegir de qué deporte se trata.
 */
export function isOtherActivityName(name?: string | null): boolean {
  if (!name) return false
  return normalize(name)
    .split(/[^a-z0-9]+/)
    .some((word) => OTHER_WORDS.has(word))
}

/** Búsqueda del selector: por label, id o keywords, sin acentos ni mayúsculas. */
export function searchSportIcons(query: string): SportIcon[] {
  const q = normalize(query).trim()
  if (!q) return SPORT_ICONS
  return SPORT_ICONS.filter((s) => {
    const haystack = [s.label, s.id, ...(s.keywords ?? [])].map(normalize).join(" ")
    return haystack.includes(q)
  })
}
