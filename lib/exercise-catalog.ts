// Catálogo de ejercicios (client-side).
//
// El JSON vive en /public/ejercicios.json (870 ejercicios, con traducción al
// español, imágenes y nivel de "fama"). Es ~1.2MB, así que NO lo importamos en
// el bundle: lo bajamos una sola vez con fetch y lo cacheamos en memoria.
//
// Las imágenes están en /public/exercises/<id>/<n>.jpg -> se sirven en /exercises/...
//
// Módulo PURO (sin "use server"): lo usan solo componentes cliente. Toda la lógica
// de filtros/búsqueda/traducción vive acá para no duplicarla en cada pantalla.

export type Fame = 1 | 2 | 3

export type Exercise = {
  /** id estable del catálogo, ej "Barbell_Bench_Press". También es la carpeta de imágenes. */
  id: string
  /** nombre en inglés (fuente original) */
  name: string
  /** nombre en español */
  nombre: string
  /** nombres/sinónimos alternativos, para que la búsqueda también matchee por ellos */
  otherNames?: string[]
  force: "pull" | "push" | "static" | null
  level: "beginner" | "intermediate" | "expert"
  mechanic: "compound" | "isolation" | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  instrucciones: string[]
  category: string
  images: string[]
  fame: Fame
}

// ---------------------------------------------------------------------------
// Traducciones ES para todos los campos de filtro.
// ---------------------------------------------------------------------------

export const MUSCLE_ES: Record<string, string> = {
  abdominals: "Abdominales",
  abductors: "Abductores",
  adductors: "Aductores",
  biceps: "Bíceps",
  calves: "Gemelos",
  chest: "Pecho",
  forearms: "Antebrazos",
  glutes: "Glúteos",
  hamstrings: "Isquiotibiales",
  lats: "Dorsales",
  "lower back": "Espalda baja",
  "middle back": "Espalda media",
  neck: "Cuello",
  quadriceps: "Cuádriceps",
  shoulders: "Hombros",
  traps: "Trapecios",
  triceps: "Tríceps",
}

export const EQUIPMENT_ES: Record<string, string> = {
  "body only": "Peso corporal",
  machine: "Máquina",
  dumbbell: "Mancuernas",
  barbell: "Barra",
  cable: "Polea",
  kettlebells: "Kettlebell",
  bands: "Bandas",
  "medicine ball": "Balón medicinal",
  "exercise ball": "Pelota de ejercicio",
  "e-z curl bar": "Barra Z",
  "foam roll": "Rodillo",
  other: "Otro",
}

export const CATEGORY_ES: Record<string, string> = {
  strength: "Fuerza",
  stretching: "Elongación",
  plyometrics: "Pliometría",
  strongman: "Strongman",
  powerlifting: "Powerlifting",
  cardio: "Cardio",
  "olympic weightlifting": "Halterofilia",
}

export const FORCE_ES: Record<string, string> = {
  pull: "Tirón",
  push: "Empuje",
  static: "Estático",
}

export const LEVEL_ES: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  expert: "Avanzado",
}

export const MECHANIC_ES: Record<string, string> = {
  compound: "Compuesto",
  isolation: "Aislamiento",
}

export const FAME_LABEL: Record<Fame, string> = {
  1: "Populares",
  2: "Comunes",
  3: "Todos",
}

// Traducciones convenientes que tolera valores desconocidos/null.
export const tMuscle = (m: string) => MUSCLE_ES[m] ?? m
export const tEquipment = (e: string | null) => (e ? EQUIPMENT_ES[e] ?? e : "Sin equipo")
export const tCategory = (c: string) => CATEGORY_ES[c] ?? c
export const tForce = (f: string | null) => (f ? FORCE_ES[f] ?? f : "—")
export const tLevel = (l: string) => LEVEL_ES[l] ?? l
export const tMechanic = (m: string | null) => (m ? MECHANIC_ES[m] ?? m : "—")

/** URL pública de una imagen del ejercicio (images[] guarda "<id>/0.jpg"). */
export function exerciseImageUrl(image: string): string {
  return `/exercises/${image}`
}

/** Primera imagen (thumbnail) o placeholder. */
export function exerciseThumb(ex: Pick<Exercise, "images">): string {
  return ex.images?.[0] ? exerciseImageUrl(ex.images[0]) : "/placeholder.svg"
}

// ---------------------------------------------------------------------------
// Carga + caché en memoria.
// ---------------------------------------------------------------------------

let cache: Exercise[] | null = null
let inflight: Promise<Exercise[]> | null = null

// ~560 ejercicios no tienen traducción ES (nombre/instrucciones vienen sin definir)
// y otros campos podrían faltar. Normalizamos una sola vez al cargar para que el
// resto de la app nunca reciba undefined: caemos al inglés y garantizamos arrays.
// (Sin esto, un `nombre` undefined dejaba tarjetas sin título y rompía la búsqueda
//  al hacer `undefined.toLowerCase()`.)
function normalizeExercise(e: any): Exercise {
  return {
    ...e,
    name: typeof e.name === "string" ? e.name : "",
    nombre: typeof e.nombre === "string" && e.nombre ? e.nombre : e.name || "Ejercicio",
    otherNames: Array.isArray(e.otherNames) ? e.otherNames : undefined,
    instructions: Array.isArray(e.instructions) ? e.instructions : [],
    instrucciones:
      Array.isArray(e.instrucciones) && e.instrucciones.length
        ? e.instrucciones
        : Array.isArray(e.instructions)
          ? e.instructions
          : [],
    primaryMuscles: Array.isArray(e.primaryMuscles) ? e.primaryMuscles : [],
    secondaryMuscles: Array.isArray(e.secondaryMuscles) ? e.secondaryMuscles : [],
    images: Array.isArray(e.images) ? e.images : [],
  }
}

export async function loadExercises(): Promise<Exercise[]> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = fetch("/ejercicios.json", { cache: "force-cache" })
    .then((r) => r.json())
    .then((data: Exercise[]) => {
      cache = data.map(normalizeExercise)
      inflight = null
      return cache
    })
    .catch((err) => {
      inflight = null
      throw err
    })
  return inflight
}

/** Busca un ejercicio por id en el catálogo ya cargado (o lo carga). */
export async function getExerciseById(id: string): Promise<Exercise | undefined> {
  const all = await loadExercises()
  return all.find((e) => e.id === id)
}

// ---------------------------------------------------------------------------
// Filtros + búsqueda.
// ---------------------------------------------------------------------------

export type ExerciseFilters = {
  search?: string
  fame?: Fame // muestra ejercicios con fame <= este valor (1 = solo top, 3 = todos)
  muscles?: string[] // primaryMuscles (raw en inglés)
  equipment?: string[]
  category?: string[]
  force?: string[]
  level?: string[]
  mechanic?: string[]
}

// Normaliza para búsqueda: sin acentos, minúsculas.
function norm(s: string | null | undefined): string {
  if (!s) return ""
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
}

/** Lista de valores distintos presentes en el catálogo para armar los selectores. */
export function facetValues(all: Exercise[]) {
  const muscles = new Set<string>()
  const equipment = new Set<string>()
  const category = new Set<string>()
  for (const e of all) {
    e.primaryMuscles.forEach((m) => muscles.add(m))
    if (e.equipment) equipment.add(e.equipment)
    category.add(e.category)
  }
  return {
    muscles: [...muscles].sort((a, b) => tMuscle(a).localeCompare(tMuscle(b))),
    equipment: [...equipment].sort((a, b) => tEquipment(a).localeCompare(tEquipment(b))),
    category: [...category].sort((a, b) => tCategory(a).localeCompare(tCategory(b))),
  }
}

// ---------------------------------------------------------------------------
// Detección de filtros a partir del nombre de una rutina.
//
// Si el usuario nombra su rutina "Pecho y tríceps", "Push", "Leg day", etc.,
// intentamos adivinar qué músculos/fuerza está buscando para pre-cargar los
// filtros del catálogo. Devuelve los valores "crudos" (en inglés) que entienden
// los filtros, más labels en español para mostrarlos en el cartel.
// ---------------------------------------------------------------------------

type NameHint = { keywords: string[]; muscles?: string[]; force?: string[]; label: string }

const NAME_HINTS: NameHint[] = [
  { keywords: ["push", "empuje"], force: ["push"], label: "Empuje" },
  { keywords: ["pull", "tiron", "jalon"], force: ["pull"], label: "Tirón" },
  { keywords: ["pecho", "chest", "pectoral", "pectorales"], muscles: ["chest"], label: "Pecho" },
  {
    keywords: ["espalda", "back", "dorsal", "dorsales", "lat", "lats"],
    muscles: ["lats", "middle back", "lower back", "traps"],
    label: "Espalda",
  },
  {
    keywords: ["hombro", "hombros", "shoulder", "shoulders", "deltoide", "deltoides", "delts"],
    muscles: ["shoulders"],
    label: "Hombros",
  },
  { keywords: ["bicep", "biceps", "bis"], muscles: ["biceps"], label: "Bíceps" },
  { keywords: ["tricep", "triceps", "tris"], muscles: ["triceps"], label: "Tríceps" },
  {
    keywords: ["pierna", "piernas", "leg", "legs", "cuadricep", "cuadriceps", "quad", "quads"],
    muscles: ["quadriceps", "hamstrings", "calves", "glutes"],
    label: "Piernas",
  },
  { keywords: ["gluteo", "gluteos", "glute", "glutes", "cola"], muscles: ["glutes"], label: "Glúteos" },
  {
    keywords: ["isquio", "isquios", "isquiotibiales", "hamstring", "hamstrings", "femoral", "femorales"],
    muscles: ["hamstrings"],
    label: "Isquiotibiales",
  },
  { keywords: ["gemelo", "gemelos", "pantorrilla", "pantorrillas", "calf", "calves"], muscles: ["calves"], label: "Gemelos" },
  { keywords: ["abdominal", "abdominales", "abdomen", "abs", "core"], muscles: ["abdominals"], label: "Abdominales" },
  { keywords: ["antebrazo", "antebrazos", "forearm", "forearms"], muscles: ["forearms"], label: "Antebrazos" },
  { keywords: ["trapecio", "trapecios", "trap", "traps"], muscles: ["traps"], label: "Trapecios" },
]

export type DetectedFilters = { muscles: string[]; force: string[]; labels: string[] }

/** Analiza el nombre de una rutina y sugiere filtros de músculo/fuerza. */
export function detectRoutineFilters(name: string): DetectedFilters | null {
  const hay = norm(name)
  if (!hay) return null

  const muscles = new Set<string>()
  const force = new Set<string>()
  const labels: string[] = []

  for (const hint of NAME_HINTS) {
    const matched = hint.keywords.some((k) => new RegExp(`\\b${k}\\b`).test(hay))
    if (!matched) continue
    labels.push(hint.label)
    hint.muscles?.forEach((m) => muscles.add(m))
    hint.force?.forEach((f) => force.add(f))
  }

  if (muscles.size === 0 && force.size === 0) return null
  return { muscles: [...muscles], force: [...force], labels }
}

export function filterExercises(all: Exercise[], f: ExerciseFilters): Exercise[] {
  const q = f.search ? norm(f.search) : ""
  const fame = f.fame ?? 1

  return all.filter((e) => {
    if (e.fame > fame) return false
    if (f.muscles?.length && !f.muscles.some((m) => e.primaryMuscles.includes(m))) return false
    if (f.equipment?.length && !(e.equipment && f.equipment.includes(e.equipment))) return false
    if (f.category?.length && !f.category.includes(e.category)) return false
    if (f.force?.length && !(e.force && f.force.includes(e.force))) return false
    if (f.level?.length && !f.level.includes(e.level)) return false
    if (f.mechanic?.length && !(e.mechanic && f.mechanic.includes(e.mechanic))) return false
    if (q) {
      // busca en nombre ES e EN + sinónimos (otherNames) + músculos ES/EN
      const hay =
        norm(e.nombre).includes(q) ||
        norm(e.name).includes(q) ||
        (e.otherNames?.some((n) => norm(n).includes(q)) ?? false) ||
        e.primaryMuscles.some((m) => norm(tMuscle(m)).includes(q) || norm(m).includes(q))
      if (!hay) return false
    }
    return true
  })
}
