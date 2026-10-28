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
  { category: "training", text: "Calentá con el mismo ejercicio que vas a hacer: 2 series livianas antes del peso real preparan el patrón de movimiento." },
  { category: "training", text: "Respirá bien: tomá aire antes de bajar y soltalo al empujar. Sostener el aire en la parte dura te da estabilidad." },
  { category: "training", text: "El rango completo de movimiento construye más músculo que medias repeticiones con más peso." },
  { category: "training", text: "Cambiá la rutina cada 8 a 12 semanas, no cada 2: el cuerpo necesita tiempo para adaptarse y progresar." },
  { category: "training", text: "Hacé cardio después de las pesas, no antes: así llegás con energía a lo que más fuerza exige." },
  { category: "training", text: "Dominadas, fondos y flexiones: con el peso del cuerpo se puede progresar muchísimo sin pisar un gimnasio." },
  { category: "training", text: "Sumá 10 minutos de estiramiento al terminar: mejora la movilidad y baja la tensión acumulada." },
  { category: "training", text: "No compares tu semana 1 con el año 5 de otro. Compará con tu versión del mes pasado." },
  { category: "training", text: "Si te duele algo puntual (no el cansancio normal), parás. Entrenar lesionado te cuesta meses, no días." },
  { category: "training", text: "El core no son solo abdominales: planchas, pallof press y peso muerto lo trabajan mejor que mil crunches." },
  { category: "training", text: "Filmate haciendo los ejercicios pesados: lo que sentís y lo que hacés no siempre coinciden." },
  { category: "training", text: "Una rutina de 45 minutos bien hecha le gana a 2 horas charlando entre series." },
  { category: "training", text: "El progreso no es lineal: habrá semanas estancadas. Lo importante es la tendencia de los meses." },
  { category: "training", text: "Entrenar con alguien del grupo sube la adherencia: es mucho más difícil faltar si te esperan." },
  { category: "training", text: "Mantené los glúteos despiertos: puente de glúteos y hip thrust previenen dolores de espalda baja." },
  { category: "training", text: "Usá los mismos zapatos y la misma barra cuando compares marcas: los pequeños cambios alteran el peso que movés." },
  { category: "training", text: "La semana de descarga (bajar el peso un 40 %) cada 6 a 8 semanas no te atrasa: te prepara para volver más fuerte." },
  { category: "training", text: "Movete todos los días aunque no entrenes: una caminata de 20 minutos mantiene el hábito vivo." },
  { category: "training", text: "El mejor ejercicio es el que vas a hacer de verdad. Elegí deportes que disfrutes y la constancia viene sola." },
  { category: "training", text: "Agarre firme en todo: apretar la barra activa toda la cadena y te da más fuerza en press, remo y peso muerto." },

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
  { category: "nutrition", text: "Desayuná con proteína: huevos o yogur te dejan saciado hasta el mediodía mucho más que facturas." },
  { category: "nutrition", text: "Llená la mitad del plato con verduras, un cuarto con proteína y un cuarto con carbohidratos. Simple y funciona." },
  { category: "nutrition", text: "Los carbohidratos no engordan: el exceso de calorías engorda. Ponelos alrededor del entrenamiento y rinden." },
  { category: "nutrition", text: "Tené snacks listos: frutos secos, fruta o yogur evitan que a las 17 hs ataques la alacena." },
  { category: "nutrition", text: "Cociná de más y freezá: tener comida lista es la mejor defensa contra el pedido impulsivo." },
  { category: "nutrition", text: "Leé las etiquetas: \"light\" o \"fit\" no significa pocas calorías, significa marketing." },
  { category: "nutrition", text: "El pescado dos veces por semana aporta omega 3, que ayuda a recuperar y baja la inflamación." },
  { category: "nutrition", text: "Un café antes de entrenar mejora el rendimiento. Después de las 15 hs, mejor descafeinado." },
  { category: "nutrition", text: "La creatina es el suplemento con más evidencia: 3 a 5 g por día, cualquier hora, sin cargas." },
  { category: "nutrition", text: "No hace falta comer cada 3 horas: lo que importa es el total del día y llegar a la proteína." },
  { category: "nutrition", text: "Pesá las porciones una semana y después andá a ojo: vas a sorprenderte de cuánto comías de verdad." },
  { category: "nutrition", text: "Salir a comer afuera no rompe nada: pedí proteína, verduras y controlá el pan y las bebidas." },
  { category: "nutrition", text: "Comer bien 80 % del tiempo es sostenible; el 100 % dura dos semanas y termina en un atracón." },
  { category: "nutrition", text: "Las frutas son el postre ideal: dulces, con fibra y agua, por un cuarto de las calorías de un helado." },
  { category: "nutrition", text: "Un plato hondo o chico te hace comer menos sin sentir que te privás." },
  { category: "nutrition", text: "Si querés ganar masa, el superávit es de 200 a 300 kcal, no de 1.000: lo demás es grasa." },
  { category: "nutrition", text: "Hidratate durante el entrenamiento: con un 2 % de deshidratación ya perdés fuerza y concentración." },

  // ── Sueño ──────────────────────────────────────────────────────────────
  { category: "sleep", text: "Dormí entre 7 y 9 horas. Con menos de 6, el cuerpo recupera peor y el hambre al otro día sube." },
  { category: "sleep", text: "Acostate y levantate a la misma hora todos los días, también el fin de semana: el reloj interno lo agradece." },
  { category: "sleep", text: "Nada de pantallas 30 minutos antes de dormir: la luz azul le avisa al cerebro que todavía es de día." },
  { category: "sleep", text: "Cortá la cafeína después de las 15 hs: sigue en el cuerpo hasta 8 horas después de tomarla." },
  { category: "sleep", text: "Habitación oscura, silenciosa y fresca (18 a 20 °C): las tres cosas que más mejoran la calidad del sueño." },
  { category: "sleep", text: "Entrenar fuerte justo antes de dormir puede costarte conciliar el sueño: dejá al menos 2 horas de margen." },
  { category: "sleep", text: "Una siesta de 20 minutos recarga; una de 90 te deja más dormido que antes." },
  { category: "sleep", text: "El sueño es parte del entrenamiento: durante la fase profunda se libera la hormona de crecimiento." },
  { category: "sleep", text: "Usá la cama solo para dormir: si trabajás o mirás series ahí, el cerebro deja de asociarla con descansar." },
  { category: "sleep", text: "Si no te dormís en 20 minutos, levantate y hacé algo tranquilo con poca luz. Dar vueltas solo suma ansiedad." },
  { category: "sleep", text: "Luz de sol en los primeros 30 minutos del día: ajusta el reloj interno y te ayuda a dormir a la noche." },
  { category: "sleep", text: "Cená liviano y al menos 2 horas antes de acostarte: la digestión pesada fragmenta el sueño." },
  { category: "sleep", text: "Una rutina fija antes de dormir (ducha, lectura, luz baja) le avisa al cuerpo que se viene el descanso." },
  { category: "sleep", text: "Dormir poco sube la grelina (hambre) y baja la leptina (saciedad): al otro día comés más sin notarlo." },
  { category: "sleep", text: "Dormir mal una noche baja la fuerza y la coordinación: si entrenás pesado, que no sea el día después de una mala noche." },
  { category: "sleep", text: "Mantené el celular fuera del dormitorio. Si lo usás de alarma, comprá un despertador: cuesta menos que una noche perdida." },
  { category: "sleep", text: "El alcohol te duerme rápido pero arruina la segunda mitad de la noche: te levantás cansado aunque hayas dormido 8 horas." },
  { category: "sleep", text: "El magnesio, el té de tilo o la melatonina pueden ayudar, pero ninguno reemplaza una rutina de horarios." },
  { category: "sleep", text: "Si roncás fuerte o te despertás cansado siempre, consultá: la apnea del sueño es frecuente y tiene tratamiento." },
  { category: "sleep", text: "Escribí lo pendiente antes de acostarte: sacar la lista de la cabeza al papel corta el \"rumiar\" en la cama." },
]

/** Devuelve un tip al azar. Llamar del lado del cliente (en un effect) para
 *  no generar mismatch de hidratación. */
export function randomTip(): ToroTip {
  return TORO_TIPS[Math.floor(Math.random() * TORO_TIPS.length)]
}
