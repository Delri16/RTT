import { NextResponse } from "next/server"

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1387818080297685162/U3pD3VQ9XBfArd-FixHLIRjD5qewrHwTUt-0Lwadvw_NnJj19H4R_WZVTS26anqQyooR"

type VoteValue = "yes" | "no" | "neutral"

type FeedbackPayload = {
  votes: Record<string, VoteValue>
  featureLabels: Record<string, string>
  suggestion: string
}

const VOTE_EMOJI: Record<VoteValue, string> = {
  yes: "✅ Sí",
  no: "❌ No",
  neutral: "🤷 Me da igual",
}

export async function POST(request: Request) {
  let body: FeedbackPayload

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { votes, featureLabels, suggestion } = body

  if (!votes || typeof votes !== "object") {
    return NextResponse.json({ error: "Missing votes" }, { status: 400 })
  }

  const lines = Object.entries(votes).map(([key, value]) => {
    const label = featureLabels?.[key] ?? key
    const emoji = VOTE_EMOJI[value] ?? value
    return `• **${label}**: ${emoji}`
  })

  const suggestionText = (suggestion ?? "").trim()

  let content = ["📋 **Nueva respuesta - RTT2 Feedback**", "", ...lines].join("\n")

  content += `\n\n💬 **Sugerencias:**\n${suggestionText.length > 0 ? suggestionText : "_(sin comentarios)_"}`

  if (content.length > 1900) {
    content = content.slice(0, 1900) + "\n… (truncado)"
  }

  try {
    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text()
      console.error("Discord webhook error:", errorText)
      return NextResponse.json({ error: "Failed to send to Discord" }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending feedback:", error)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
