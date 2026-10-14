/**
 * Tips para "estar toro": entrenamiento, alimentación y sueño.
 *
 * Módulo PURO (como lib/points.ts): sin React ni Supabase, importable desde
 * cliente y server. Los usa el splash de carga (components/ui/loading-splash.tsx)
 * para mostrar uno al azar mientras carga la pantalla.
 */

export type ToroTipCategory = "training" | "nutrition" | "sleep"

export type ToroTip = {
  category: ToroTipCategory
  text: string
}

export const TIP_CATEGORY_META: Record<ToroTipCategory, { label: string; emoji: string }> = {
  training: { label: "Entrenamiento", emoji: "🏋️" },
  nutrition: { label: "Alimentación", emoji: "🥗" },
  sleep: { label: "Sueño", emoji: "😴" },
}

export const TORO_TIPS: ToroTip[] = [
  // ── Entrenamiento ──────────────────────────────────────────────────────
  { category: "training", text: "Entrená 5 minutos antes de entrenar: movilidad y activación bajan el riesgo de lesión y mejoran la sesión." },
  { category: "training", text: "Sobrecarga progresiva: sumá un poco de peso o una repetición cada semana. Lo que no se exige, no crece." },
  { category: "training", text: "La técnica va antes que el peso. Una repetición bien hecha vale más que cinco a medias." },
  { category: "training", text: "Descansá 2 a 3 minutos entre series pesadas y 60 a 90 segundos en las livianas." },
  { category: "training", text: "Entrená cada grupo muscular al menos 2 veces por semana: es más efectivo que una sola sesión demoledora." },
  { category: "training", text: "No saltees las piernas: son el grupo muscular más grande y el que más hormonas anabólicas dispara." },
  { category: "training", text: "Un día de descanso no es perder el tiempo: el músculo crece cuando se recupera, no cuando entrena." },
  { category: "training", text: "Anotá tus series. Lo que se mide, mejora; lo que no, se estanca sin que te des cuenta." },
  { category: "training", text: "Dejá 1 o 2 repeticiones en el tanque en la mayoría de las series: ir al fallo todo el tiempo cansa más de lo que suma." },
  { category: "training", text: "Caminar 8.000 pasos por día es la base: suma gasto calórico sin cansarte para el entrenamiento." },
  { category: "training", text: "Hacé los ejercicios compuestos primero (sentadilla, peso muerto, press, dominadas) y los de aislamiento al final." },
  { category: "training", text: "La constancia le gana a la intensidad: 3 entrenamientos por semana durante un año valen más que 6 durante un mes." },

  // ── Alimentación ───────────────────────────────────────────────────────
  { category: "nutrition", text: "Apuntá a 1,6 a 2 g de proteína por kilo de peso corporal por día para ganar o mantener músculo." },
  { category: "nutrition", text: "Tomá entre 2 y 3 litros de agua por día. Muchas veces el hambre es sed disfrazada." },
  { category: "nutrition", text: "Incluí proteína en cada comida: huevos, pollo, carne, pescado, yogur o legumbres." },
  { category: "nutrition", text: "Comé verduras en el almuerzo y la cena: fibra, saciedad y micronutrientes por pocas calorías." },
  { category: "nutrition", text: "No te saltees comidas para \"compensar\": después llega el hambre feroz y comés el doble." },
  { category: "nutrition", text: "Las bebidas azucaradas son calorías vacías. Cambiarlas por agua o soda es la mejora más fácil que existe." },
  { category: "nutrition", text: "Después de entrenar, comé proteína + carbohidratos dentro de las 2 horas para recuperar mejor." },
  { category: "nutrition", text: "Planificá las comidas de la semana: cuando improvisás con hambre, siempre gana el delivery." },
  { category: "nutrition", text: "El alcohol frena la síntesis de proteína y arruina el sueño: si tomás, que sea poco y lejos del entrenamiento." },
  { category: "nutrition", text: "Masticá despacio: el cerebro tarda unos 20 minutos en registrar que estás lleno." },
  { category: "nutrition", text: "Pesate siempre en las mismas condiciones: a la mañana, en ayunas y después de ir al baño." },

  // ── Sueño ──────────────────────────────────────────────────────────────
  { category: "sleep", text: "Dormí entre 7 y 9 horas. Con menos de 6, el cuerpo recupera peor y el hambre al otro día sube." },
  { category: "sleep", text: "Acostate y levantate a la misma hora todos los días, también el fin de semana: el reloj interno lo agradece." },
  { category: "sleep", text: "Nada de pantallas 30 minutos antes de dormir: la luz azul le avisa al cerebro que todavía es de día." },
  { category: "sleep", text: "Cortá la cafeína después de las 15 hs: sigue en el cuerpo hasta 8 horas después de tomarla." },
  { category: "sleep", text: "Habitación oscura, silenciosa y fresca (18 a 20 °C): las tres cosas que más mejoran la calidad del sueño." },
  { category: "sleep", text: "Entrenar fuerte justo antes de dormir puede costarte conciliar el sueño: dejá al menos 2 horas de margen." },
  { category: "sleep", text: "Una siesta de 20 minutos recarga; una de 90 te deja más dormido que antes." },
]

/** Devuelve un tip al azar. Llamar del lado del cliente (en un effect) para
 *  no generar mismatch de hidratación. */
export function randomTip(): ToroTip {
  return TORO_TIPS[Math.floor(Math.random() * TORO_TIPS.length)]
}
