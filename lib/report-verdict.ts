// Veredicto de un reporte de peso: ¿cumplió el objetivo o no?
//
// Módulo PURO (sin "use server") a propósito, igual que lib/points.ts: lo importa
// el feed (componente cliente) y podría importarlo el server si algún día se
// pushea el veredicto por notificación.
//
// Se compara el peso reportado contra el reporte ANTERIOR de esa persona en ese
// mismo grupo, y el signo del cambio contra su objetivo (profiles.goal):
//
//   - "lose"  (bajar):  bajar = verde, quedar igual = amarillo, subir = rojo.
//   - "gain"  (subir):  subir = verde, quedar igual = amarillo, bajar = rojo.
//   - "maintain":       |dif| < 0.5 kg = verde, 0.5 a 3 kg = amarillo, > 3 kg = rojo.
//
// Los umbrales de "maintain" son los pedidos por producto (verde < 0,5; la banda
// amarilla arranca en 0,5; rojo pasando los 3 kg), con el tramo 1–3 kg quedando
// amarillo "fuerte" (intensidad 2) para que no haya un hueco sin clasificar.

import type { WeightGoal } from "@/lib/points"

export type VerdictLevel = "green" | "yellow" | "red" | "neutral"

/** Diferencia (en kg) que se considera "pesa lo mismo" para lose/gain. */
export const SAME_WEIGHT_TOL = 0.3

/** Umbrales de "maintain" (kg de diferencia absoluta). */
export const MAINTAIN_GREEN = 0.5
export const MAINTAIN_RED = 3

export interface ReportVerdict {
  level: VerdictLevel
  /** Cambio de peso firmado (positivo = subió). null si es el primer reporte. */
  delta: number | null
  prevWeight: number | null
  goal: WeightGoal
  /** "bajar de peso" / "subir de peso" / "mantenerse" */
  goalLabel: string
  /** Título grandote: "¡OBJETIVO CUMPLIDO!", "NO CUMPLIÓ", etc. */
  headline: string
  emoji: string
  /** Burla o felicitación, ya con los kg metidos adentro. */
  message: string
  /** "+1,4 kg" / "-0,8 kg" / "0 kg" */
  deltaLabel: string
  /** 1 = flojo, 2 = fuerte, 3 = extremo. Escala el diseño de la tarjeta. */
  intensity: 1 | 2 | 3
}

const GOAL_LABEL: Record<WeightGoal, string> = {
  lose: "bajar de peso",
  gain: "subir de peso",
  maintain: "mantenerse",
}

export function normalizeGoal(goal: string | null | undefined): WeightGoal {
  return goal === "lose" || goal === "gain" ? goal : "maintain"
}

/** 1 decimal con coma, como se escriben los kilos en criollo. */
export function formatKg(kg: number): string {
  const rounded = Math.round(Math.abs(kg) * 10) / 10
  return rounded.toString().replace(".", ",")
}

function formatDelta(delta: number): string {
  const abs = Math.round(Math.abs(delta) * 10) / 10
  if (abs === 0) return "0 kg"
  return `${delta > 0 ? "+" : "-"}${formatKg(abs)} kg`
}

// Hash estable: la burla que le toca a un reporte no cambia entre renders ni
// entre server y cliente (nada de Math.random acá).
function pick<T>(options: T[], seed: string): T {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return options[Math.abs(h) % options.length]
}

// {m} se reemplaza por los kilos de diferencia (absolutos, ya formateados).
const MESSAGES: Record<string, string[]> = {
  // Tenía que bajar y bajó 🎉
  "lose:green:1": [
    "Bajó {m} kg. Arrancó el descenso, no aflojes 💪",
    "{m} kg menos. Poquito, pero para el lado correcto 👏",
  ],
  "lose:green:2": [
    "¡{m} KG MENOS! Se está derritiendo el muchacho 🔥",
    "¡-{m} kg! Objetivo cumplido y con autoridad 💪🔥",
  ],
  "lose:green:3": [
    "¡¡{m} KG MENOS!! Esto ya es otra persona, aplausos de pie 👏👏🔥",
    "¡¡-{m} KG!! Alguien avísele a la balanza que se calme. BESTIA 🏆🔥",
  ],
  // Tenía que bajar y quedó igual 😐
  "lose:yellow:1": [
    "Quedó clavado en el mismo peso ({d}) y tenía que BAJAR. Algo de esfuerzo, ¿no? 😐",
    "Ni bajó ni subió ({d}). Tenía que bajar, eh… medio pelo esto 😬",
  ],
  // Tenía que bajar y subió 💀
  "lose:red:1": [
    "Subió {m} kg cuando tenía que bajar. Che… ¿dejamos el pancito? 🍞",
    "+{m} kg y el objetivo era bajar. Empezá a cerrar la boca, campeón 🤐",
  ],
  "lose:red:2": [
    "+{m} kg teniendo que BAJAR. DEJÁ DE COMER, literal 🚫🍔",
    "¡{m} KG MÁS! Al revés, todo al revés. Basta de delivery 🛑🍕",
  ],
  "lose:red:3": [
    "¡¡+{m} KG!! En la dirección MÁS equivocada posible. ¿Te comiste la heladera entera? 🐖",
    "¡¡{m} KG MÁS!! Esto ya no es un desliz, es una carrera hacia el asado 💀🥩",
  ],
  // Tenía que subir y subió 🎉
  "gain:green:1": [
    "Subió {m} kg. Empezó a crecer el toro 🐂",
    "+{m} kg. Poquito, pero el toro está en camino 💪",
  ],
  "gain:green:2": [
    "¡+{m} KG de puro toro! Así se hace 💪🔥",
    "¡{m} kg más! Objetivo cumplido, sigan comiendo así 🍽️🔥",
  ],
  "gain:green:3": [
    "¡¡+{m} KG!! Esto ya no es una persona, es un ARMARIO 🐂🔥",
    "¡¡{m} KG MÁS!! Se rompió la balanza y el récord. MONSTRUO 🏆🐂",
  ],
  // Tenía que subir y quedó igual 😐
  "gain:yellow:1": [
    "Quedó igual ({d}) y tenía que SUBIR. Ese plato se come ENTERO, eh 😐🍝",
    "Cero cambios ({d}). El objetivo era subir: falta un fideo más 😬🍝",
  ],
  // Tenía que subir y bajó 💀
  "gain:red:1": [
    "Bajó {m} kg cuando tenía que subir. ¡PONETE A COMER! 🍽️",
    "-{m} kg y el objetivo era subir. Che, un arrocito, ALGO 🍚",
  ],
  "gain:red:2": [
    "¡{m} KG MENOS! teniendo que subir. COMÉ, te lo pedimos por favor 🍽️🚨",
    "-{m} kg al revés del objetivo. ¿Estás a dieta de aire? 😤",
  ],
  "gain:red:3": [
    "¡¡-{m} KG!! Te estás desintegrando. COMÉ YA 💀🍽️",
    "¡¡{m} KG MENOS!! A este paso lo llevamos de llavero. EMERGENCIA ALIMENTARIA 🚨🍔",
  ],
  // Mantener, dentro del margen 🎯
  "maintain:green:2": [
    "Se movió apenas {m} kg. Control total ⚖️✨",
    "Solo {m} kg de diferencia. Mantener también es ganar 👏",
  ],
  "maintain:green:3": [
    "¡{m} kg de diferencia! Es una BALANZA con patas ⚖️🔥",
    "¡Clavado en {m} kg de diferencia! Precisión quirúrgica 🎯🔥",
  ],
  // Mantener, se movió de más 😬
  "maintain:yellow:1": [
    "Se movió {m} kg. Ojo, que mantener también es un objetivo 👀",
    "{m} kg de diferencia. Un poquito de temblequeo en la balanza 😬",
  ],
  "maintain:yellow:2": [
    "{m} kg de diferencia teniendo que MANTENER. Eso ya se nota, eh 👀",
    "Se movió {m} kg. Tenías un solo trabajo: quedarte quieto 😅",
  ],
  // Mantener, se fue al carajo 💀
  "maintain:red:2": [
    "¡{m} kg de diferencia! Eso no es mantener, eso es viajar 🎢",
    "{m} kg para un lado. Mantener era la parte fácil… 💀",
  ],
  "maintain:red:3": [
    "¡¡{m} KG de diferencia!! Esto no es mantenerse, es otro cuerpo 💀🎢",
    "¡¡{m} KG!! La balanza pidió licencia. Cero mantenimiento acá 🚨",
  ],
}

const HEADLINE: Record<Exclude<VerdictLevel, "neutral">, string> = {
  green: "¡OBJETIVO CUMPLIDO!",
  yellow: "AHÍ NOMÁS…",
  red: "NO CUMPLIÓ EL OBJETIVO",
}

const LEVEL_EMOJI: Record<VerdictLevel, string> = {
  green: "🎉",
  yellow: "😐",
  red: "💀",
  neutral: "⚖️",
}

export function getReportVerdict(params: {
  weight: number
  prevWeight: number | null | undefined
  goal: string | null | undefined
  /** Semilla para elegir la burla (usar el id del reporte). */
  seed?: string
}): ReportVerdict {
  const goal = normalizeGoal(params.goal)
  const goalLabel = GOAL_LABEL[goal]
  const prevWeight = typeof params.prevWeight === "number" ? params.prevWeight : null

  // Primer reporte del grupo: no hay con qué comparar todavía.
  if (prevWeight == null) {
    return {
      level: "neutral",
      delta: null,
      prevWeight: null,
      goal,
      goalLabel,
      headline: "PRIMER REPORTE",
      emoji: LEVEL_EMOJI.neutral,
      message: `Esta es su marca base. Desde acá se mide si cumple con ${goalLabel} ⚖️`,
      deltaLabel: `${formatKg(params.weight)} kg`,
      intensity: 1,
    }
  }

  const delta = Math.round((params.weight - prevWeight) * 10) / 10
  const abs = Math.abs(delta)
  const deltaLabel = formatDelta(delta)

  let level: Exclude<VerdictLevel, "neutral">
  let intensity: 1 | 2 | 3

  if (goal === "maintain") {
    if (abs < MAINTAIN_GREEN) {
      level = "green"
      intensity = abs <= 0.2 ? 3 : 2
    } else if (abs <= MAINTAIN_RED) {
      level = "yellow"
      intensity = abs <= 1 ? 1 : 2
    } else {
      level = "red"
      intensity = abs > 5 ? 3 : 2
    }
  } else {
    const goodDirection = goal === "lose" ? -1 : 1
    if (abs < SAME_WEIGHT_TOL) {
      level = "yellow"
      intensity = 1
    } else {
      level = Math.sign(delta) === goodDirection ? "green" : "red"
      intensity = abs >= 2.5 ? 3 : abs >= 1 ? 2 : 1
    }
  }

  const key = `${goal}:${level}:${intensity}`
  const options = MESSAGES[key] ?? MESSAGES[`${goal}:${level}:1`] ?? [""]
  const message = pick(options, params.seed ?? key)
    .replaceAll("{m}", formatKg(abs))
    .replaceAll("{d}", deltaLabel)

  return {
    level,
    delta,
    prevWeight,
    goal,
    goalLabel,
    headline: HEADLINE[level],
    emoji: LEVEL_EMOJI[level],
    message,
    deltaLabel,
    intensity,
  }
}
