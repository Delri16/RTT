/**
 * Juegos de descanso.
 *
 * Módulo PURO (como `lib/points.ts`, `lib/streaks.ts` y `lib/sport-icons.ts`):
 * define qué juego toca y con qué contenido. La lógica de cada juego vive en su
 * componente; acá está solo lo que hace falta compartir entre cliente y server.
 *
 * Idea: entre serie y serie hay 60-180 segundos y la gente los gasta en otra
 * app. El juego NO acompaña al timer, ES el timer: dura exactamente lo que dura
 * el descanso y te devuelve a la serie cuando termina.
 *
 * Igual que el Wordle, hay UN juego por día y es el mismo para todo el grupo,
 * así el resultado da tema de conversación. La elección es determinística a
 * partir de la fecha (no Math.random), para que a todos les toque lo mismo.
 */

export type RestGameKey = "reaccion" | "memoria" | "trivia" | "precision"

export type RestGame = {
  key: RestGameKey
  name: string
  emoji: string
  /** Una línea explicando cómo se juega, que se muestra antes de arrancar. */
  howTo: string
}

export const REST_GAMES: RestGame[] = [
  {
    key: "reaccion",
    name: "Reacción",
    emoji: "⚡",
    howTo: "Tocá apenas la pantalla se ponga verde. Cuanto más rápido, más puntos.",
  },
  {
    key: "memoria",
    name: "Memoria",
    emoji: "🧠",
    howTo: "Mirá la secuencia y repetila. Cada ronda suma un paso más.",
  },
  {
    key: "trivia",
    name: "Trivia fierrera",
    emoji: "💡",
    howTo: "Preguntas de gimnasio y nutrición. Respondé rápido y sin errar.",
  },
  {
    key: "precision",
    name: "Precisión",
    emoji: "🎯",
    howTo: "Frená la barra dentro de la zona verde. Se va achicando.",
  },
]

const BY_KEY = new Map(REST_GAMES.map((g) => [g.key, g]))

export function getRestGame(key?: string | null): RestGame | null {
  if (!key) return null
  return BY_KEY.get(key as RestGameKey) ?? null
}

/**
 * Qué juego toca hoy. Determinístico a partir de la clave del día
 * ("YYYY-MM-DD" en hora Argentina, de argDayKey): todos ven el mismo.
 */
export function gameOfTheDay(dayKey: string): RestGame {
  let hash = 0
  for (let i = 0; i < dayKey.length; i++) {
    hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0
  }
  return REST_GAMES[hash % REST_GAMES.length]
}

// ---------------------------------------------------------------------------
// Trivia
// ---------------------------------------------------------------------------

export type TriviaQuestion = {
  q: string
  options: string[]
  /** Índice de la opción correcta dentro de `options`. */
  answer: number
}

export const TRIVIA: TriviaQuestion[] = [
  { q: "¿Qué músculo trabaja principalmente el press de banca?", options: ["Pectoral", "Dorsal", "Cuádriceps"], answer: 0 },
  { q: "¿Cuántos gramos de proteína tiene aprox. 100g de pechuga de pollo?", options: ["11 g", "31 g", "52 g"], answer: 1 },
  { q: "El peso muerto trabaja sobre todo…", options: ["Cadena posterior", "Hombros", "Gemelos"], answer: 0 },
  { q: "¿Qué significa 1RM?", options: ["Una repetición máxima", "Un round por minuto", "Un ritmo medio"], answer: 0 },
  { q: "¿Cuál NO es un ejercicio compuesto?", options: ["Sentadilla", "Curl de bíceps", "Dominadas"], answer: 1 },
  { q: "¿Cuántas kcal tiene aprox. un gramo de grasa?", options: ["4", "7", "9"], answer: 2 },
  { q: "El músculo crece principalmente…", options: ["Durante el entrenamiento", "Durante el descanso", "Al estirar"], answer: 1 },
  { q: "¿Qué es una superserie?", options: ["Dos ejercicios seguidos sin descanso", "Una serie al fallo", "Una serie con 20 reps"], answer: 0 },
  { q: "¿Qué músculo trabaja el remo con barra?", options: ["Espalda", "Pecho", "Tríceps"], answer: 0 },
  { q: "¿Cuántos gramos de proteína tiene aprox. un huevo?", options: ["6 g", "13 g", "21 g"], answer: 0 },
  { q: "El sóleo y el gastrocnemio son…", options: ["Gemelos", "Abdominales", "Antebrazos"], answer: 0 },
  { q: "¿Qué mide el RPE?", options: ["El esfuerzo percibido", "Las pulsaciones", "El volumen"], answer: 0 },
  { q: "Para hipertrofia, el rango clásico de reps es…", options: ["1 a 3", "6 a 12", "30 a 50"], answer: 1 },
  { q: "¿Cuál es el músculo más grande del cuerpo?", options: ["Glúteo mayor", "Dorsal ancho", "Cuádriceps"], answer: 0 },
  { q: "¿Qué es el 'volumen' de entrenamiento?", options: ["Series × reps × peso", "El peso máximo", "Los minutos entrenados"], answer: 0 },
  { q: "El agua representa aprox. qué % del músculo:", options: ["25%", "50%", "75%"], answer: 2 },
  { q: "¿Qué ejercicio aísla mejor el tríceps?", options: ["Extensión en polea", "Press militar", "Remo"], answer: 0 },
  { q: "¿Cuántas kcal tiene aprox. un gramo de proteína?", options: ["4", "7", "9"], answer: 0 },
  { q: "Las dominadas en supinación cargan más…", options: ["Bíceps", "Tríceps", "Hombro"], answer: 0 },
  { q: "¿Qué es un 'drop set'?", options: ["Bajar el peso y seguir", "Descansar 5 min", "Hacer solo la negativa"], answer: 0 },
]

/**
 * Preguntas de trivia del día, siempre en el mismo orden para todos.
 * Baraja determinística (Fisher-Yates con PRNG sembrado por la fecha).
 */
export function triviaForDay(dayKey: string, count = 8): TriviaQuestion[] {
  let seed = 0
  for (let i = 0; i < dayKey.length; i++) {
    seed = (seed * 31 + dayKey.charCodeAt(i)) >>> 0
  }
  // xorshift32: suficiente para barajar y no arrastra dependencias.
  const rand = () => {
    seed ^= seed << 13
    seed >>>= 0
    seed ^= seed >> 17
    seed ^= seed << 5
    seed >>>= 0
    return seed / 0xffffffff
  }

  const pool = [...TRIVIA]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

// ---------------------------------------------------------------------------
// Descanso
// ---------------------------------------------------------------------------

/** Descanso por defecto cuando el ejercicio no tiene uno configurado. */
export const DEFAULT_REST_SECONDS = 90

/** Opciones del selector de descanso, en segundos. */
export const REST_OPTIONS = [45, 60, 90, 120, 150, 180, 240]

export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m} min`
  return `${m}:${String(s).padStart(2, "0")}`
}

/** Clave de localStorage del interruptor de juegos (se puede apagar). */
export const REST_GAMES_ENABLED_KEY = "rtt_rest_games_enabled"
