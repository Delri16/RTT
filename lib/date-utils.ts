export function formatActivityDate(dateString: string): string {
  const date = new Date(dateString)

  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  const months = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]

  const dayName = days[date.getDay()]
  const day = date.getDate()
  const month = months[date.getMonth()]

  return `${dayName}, ${day}/${month}`
}

export function formatFullDate(dateString: string): string {
  const date = new Date(dateString)

  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()

  return `${day} de ${month}, ${year}`
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function isToday(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()

  return date.toDateString() === today.toDateString()
}

export function isYesterday(dateString: string): boolean {
  const date = new Date(dateString)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  return date.toDateString() === yesterday.toDateString()
}

// Compact "time ago" for the social feed: "ahora", "hace 5 min", "hace 3 h",
// "ayer", "hace 4 d", then falls back to a short date.
export function timeAgo(dateString: string): string {
  const then = new Date(dateString).getTime()
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "ahora"
  if (min < 60) return `hace ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "ayer"
  if (days < 7) return `hace ${days} d`
  return formatActivityDate(dateString)
}

export function getRelativeDate(dateString: string): string {
  if (isToday(dateString)) {
    return "Hoy"
  }
  if (isYesterday(dateString)) {
    return "Ayer"
  }
  return formatActivityDate(dateString)
}
