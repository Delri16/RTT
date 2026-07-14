// Puntos dinámicos según el objetivo de peso del usuario.
//
// Módulo PURO (sin "use server") a propósito: lo importan tanto las server actions
// (lib/actions.ts) como componentes cliente (preview en /log), y un archivo
// "use server" solo puede exportar funciones async.
//
// Cada actividad tiene aerobic_pct (0..100): cuánto es aeróbico (cardio) vs
// anaeróbico/fuerza. El objetivo del usuario ajusta los puntos:
//   - "lose"  (bajar):    premia lo aeróbico, penaliza la fuerza.
//   - "gain"  (subir):    premia la fuerza, penaliza lo aeróbico.
//   - "maintain":         neutro, puntos base tal cual.
//
// alineación = (aerobic_pct/100)*2 - 1   -> -1 (pura fuerza) .. +1 (puro aeróbico)
// dirección  = lose:+1 | gain:-1 | maintain:0
// multiplicador = 1 + GOAL_K * dirección * alineación
//
// Con GOAL_K = 0.15 el ajuste máximo es ±15% (solo en actividades 100% puras).
// Una actividad 50/50 nunca se mueve. Neutro para aerobic_pct por defecto (50).

export type WeightGoal = "lose" | "gain" | "maintain"

export const GOAL_K = 0.15

export function applyGoalMultiplier(
  basePoints: number,
  aerobicPct: number | null | undefined,
  goal: string | null | undefined,
): number {
  return Math.round(basePoints * goalMultiplier(aerobicPct, goal))
}

// Multiplicador crudo (para mostrar "+X% / -X%" en la UI sin recalcular puntos).
export function goalMultiplier(aerobicPct: number | null | undefined, goal: string | null | undefined): number {
  const a = (typeof aerobicPct === "number" ? aerobicPct : 50) / 100
  const alignment = a * 2 - 1
  const direction = goal === "lose" ? 1 : goal === "gain" ? -1 : 0
  return 1 + GOAL_K * direction * alignment
}
