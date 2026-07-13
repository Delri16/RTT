"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Quote } from "lucide-react"

const motivationalQuotes = [
  "¡Hoy es el día perfecto para ser tu mejor versión, Toro! 💪",
  "Cada repetición te acerca más al Caribe. ¡Dale que se puede! 🏝️",
  "Los músculos se construyen con constancia, no con excusas. ¡Vamos! 🔥",
  "Tu único límite eres tú mismo. ¡Rómpelo hoy, campeón! ⚡",
  "El dolor de hoy será la fuerza de mañana. ¡No te rindas! 💯",
  "Cada gota de sudor es una inversión en tu futuro yo. ¡Invierte bien! 💦",
  "Los ganadores entrenan cuando no tienen ganas. ¡Sé un ganador! 🏆",
  "Tu cuerpo puede hacerlo. Es tu mente la que necesitas convencer. 🧠",
  "No se trata de ser perfecto, se trata de ser mejor que ayer. 📈",
  "El Caribe te espera, pero primero tienes que ganártelo. ¡A entrenar! 🌴",
  "Cada día sin entrenar es un día que le das ventaja a la competencia. 🚀",
  "Tu futuro yo te agradecerá el esfuerzo de hoy. ¡Hazlo por él! ⭐",
  "Los resultados vienen a quienes trabajan por ellos. ¡Trabaja duro! ⚒️",
  "No hay atajos hacia ningún lugar que valga la pena ir. ¡Paso a paso! 👣",
  "La disciplina es hacer lo que odias como si lo amaras. ¡Disciplínate! 🎯",
  "Tu única competencia real eres tú de ayer. ¡Supérate! 🥇",
  "Los sueños no funcionan a menos que tú lo hagas. ¡Ponte a trabajar! ⚡",
  "El éxito es la suma de pequeños esfuerzos repetidos día tras día. 🔄",
  "No esperes el momento perfecto. El momento perfecto es ahora. ⏰",
  "Tu determinación de hoy define tu destino de mañana. ¡Determínate! 🎪",
  "Cada entrenamiento es una oportunidad de ser más fuerte. ¡Aprovéchala! 💪",
  "El camino al Caribe se construye con repeticiones y constancia. 🛤️",
  "No se trata de tener tiempo, se trata de hacer tiempo. ¡Hazlo! ⏳",
  "Tu cuerpo es tu templo. Trátalo como tal. ¡Entrénalo con respeto! 🏛️",
  "Los músculos crecen cuando descansas, pero se forjan cuando entrenas. ⚖️",
  "Cada 'no puedo' es una oportunidad para demostrar que sí puedes. ✊",
  "El sudor es grasa llorando. ¡Hazla llorar más! 😤",
  "Tu zona de confort es un lugar hermoso, pero nada crece ahí. 🌱",
  "Los campeones se hacen cuando nadie está mirando. ¡Sé campeón! 👑",
  "El único mal entrenamiento es el que no haces. ¡Haz algo hoy! 🎯",
  "¡No pares hasta que el cambio sea parte de vos! 🔁",
  "¡Todo sacrificio vale si es por el meta! 🙌",
  "¡Recordá por qué empezaste: por el Caribe! 🧭",
  "¡El cambio no se compra, se construye! 🔧",
  "¡Cuando dudás, pensá en el fuerza! 💭",
  "¡Recordá por qué empezaste: por el músculo! 🧭",
  "¡El sudor no se compra, se construye! 🔧",
  "¡Cuando dudás, pensá en el superación! 💭",
  "¡Si querés Caribe, entrená como un toro! 🐂",
  "¡Todo sacrificio vale si es por el Caribe! 🙌",
  "¡Si querés progreso, entrená como un toro! 🐂",
  "¡Cada paso que das te acerca al Caribe! 🚶‍♂️",
  "¡Cuando dudás, pensá en el Caribe! 💭",
  "¡El progreso es tu recompensa por no rendirte! 🎁",
  "¡Si querés fuerza, entrená como un toro! 🐂",
  "¡Cada paso que das te acerca al meta! 🚶‍♂️",
  "¡Hoy es otro día para avanzar hacia el progreso! 🛤️",
  "¡El sudor es tu recompensa por no rendirte! 🎁",
  "¡No pares hasta que el meta sea parte de vos! 🔁",
  "¡Un poco de dolor hoy, mucha fuerza mañana! 🌄",
  "¡Un poco de dolor hoy, mucha Caribe mañana! 🌄",
  "¡Cuando dudás, pensá en el cambio! 💭",
  "¡Si querés meta, entrená como un toro! 🐂",
  "¡No pares hasta que el músculo sea parte de vos! 🔁",
  "¡El meta no se compra, se construye! 🔧",
  "¡El superación no se compra, se construye! 🔧",
  "¡No pares hasta que el progreso sea parte de vos! 🔁",
  "¡Cada paso que das te acerca al progreso! 🚶‍♂️",
  "¡Cada paso que das te acerca al constancia! 🚶‍♂️",
  "¡No pares hasta que el disciplina sea parte de vos! 🔁",
  "¡No pares hasta que el Caribe sea parte de vos! 🔁",
  "¡Cada paso que das te acerca al músculo! 🚶‍♂️",
  "¡Todo sacrificio vale si es por el músculo! 🙌",
  "¡Hoy es otro día para avanzar hacia el cambio! 🛤️",
  "¡Un poco de dolor hoy, mucha meta mañana! 🌄",
  "¡Un poco de dolor hoy, mucha cambio mañana! 🌄",
  "¡Cada paso que das te acerca al disciplina! 🚶‍♂️",
  "¡Hoy es otro día para avanzar hacia el músculo! 🛤️",
  "¡El progreso no se compra, se construye! 🔧",
  "¡El meta es tu recompensa por no rendirte! 🎁",
  "¡El disciplina no se compra, se construye! 🔧",
  "¡Recordá por qué empezaste: por el sudor! 🧭",
  "¡Hoy es otro día para avanzar hacia el disciplina! 🛤️",
  "¡El disciplina es tu recompensa por no rendirte! 🎁",
  "¡Un poco de dolor hoy, mucha constancia mañana! 🌄",
  "¡Hoy es otro día para avanzar hacia el meta! 🛤️",
  "¡Todo sacrificio vale si es por el fuerza! 🙌",
  "¡El cambio es tu recompensa por no rendirte! 🎁",
  "¡Si querés constancia, entrená como un toro! 🐂",
  "¡Hoy es otro día para avanzar hacia el superación! 🛤️",
  "¡Todo sacrificio vale si es por el constancia! 🙌",
  "¡Recordá por qué empezaste: por el progreso! 🧭",
  "¡Si querés superación, entrená como un toro! 🐂",
  "¡Cuando dudás, pensá en el meta! 💭",
  "¡El Caribe es tu recompensa por no rendirte! 🎁",
  "¡Cuando dudás, pensá en el progreso! 💭",
  "¡Todo sacrificio vale si es por el sudor! 🙌",
  "¡El superación es tu recompensa por no rendirte! 🎁",
  "¡Recordá por qué empezaste: por el fuerza! 🧭",
  "¡Cada paso que das te acerca al superación! 🚶‍♂️",
  "¡Cuando dudás, pensá en el constancia! 💭",
  "¡Cuando dudás, pensá en el disciplina! 💭",
  "¡Si querés cambio, entrená como un toro! 🐂",
  "¡Recordá por qué empezaste: por el meta! 🧭",
  "¡Recordá por qué empezaste: por el superación! 🧭",
  "¡El Caribe no se compra, se construye! 🔧",
  "¡Recordá por qué empezaste: por el cambio! 🧭",
  "¡No pares hasta que el fuerza sea parte de vos! 🔁",
  "¡Un poco de dolor hoy, mucha superación mañana! 🌄",
  "¡Si querés sudor, entrená como un toro! 🐂",
  "Ari no es gracioso! 🦀",
  "Rawel, dejala!",
];


export default function MotivationalQuote() {
  const [quote, setQuote] = useState("")

  useEffect(() => {
    // Get today's date as seed for consistent daily quote
    const today = new Date()
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24),
    )

    // Use day of year as index (with modulo to cycle through quotes)
    const quoteIndex = dayOfYear % motivationalQuotes.length
    setQuote(motivationalQuotes[quoteIndex])
  }, [])

  if (!quote) return null

  return (
    <Card className="bg-gradient-to-r from-toro-accent/10 to-toro-primary/10 border-toro-accent/20 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Quote className="w-6 h-6 text-toro-accent flex-shrink-0 mt-1" />
          <div>
            <p className="text-toro-foreground font-medium leading-relaxed">{quote}</p>
            <p className="text-toro-foreground/60 text-sm mt-2">— Tu motivación diaria</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
