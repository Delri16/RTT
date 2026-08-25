/**
 * Contrato común de los juegos de descanso.
 *
 * Cada juego se monta adentro del timer (components/routine/rest-timer.tsx) y
 * vive exactamente lo que dura el descanso: no maneja su propio tiempo ni sabe
 * cuándo termina. Solo suma puntos.
 */
export type RestGameProps = {
  /** Suma puntos al marcador de la partida. Se puede llamar muchas veces. */
  addScore: (points: number) => void
  /** Marcador actual, por si el juego quiere mostrarlo adentro. */
  score: number
}
