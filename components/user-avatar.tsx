"use client"

interface UserAvatarProps {
  avatarId?: string
  username?: string
  size?: "sm" | "md" | "lg" | "xl"
  showTooltip?: boolean
  className?: string
}

const AVATARS = {
  default: "🐂",
  strong: "💪",
  fire: "🔥",
  king: "👑",
  lightning: "⚡",
  star: "⭐",
  rocket: "🚀",
  champion: "🏆",
  diamond: "💎",
  ninja: "🥷",
  robot: "🤖",
  alien: "👽",
  bullet: "🔫",
  train: "🚄",
  shark: "🦈",
  eagle: "🦅",
  lion: "🦁",
  tiger: "🐅",
  dragon: "🐉",
  phoenix: "🔥",
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-lg",
  md: "w-10 h-10 text-xl",
  lg: "w-12 h-12 text-2xl",
  xl: "w-16 h-16 text-4xl",
}

export default function UserAvatar({
  avatarId = "default",
  username,
  size = "md",
  showTooltip = true,
  className = "",
}: UserAvatarProps) {
  const emoji = AVATARS[avatarId as keyof typeof AVATARS] || AVATARS.default
  const sizeClass = SIZE_CLASSES[size]

  return (
    <div
      className={`
        ${sizeClass} 
        rounded-full bg-gradient-to-br from-toro-background to-toro-secondary/20 
        border-2 border-toro-primary/20 
        flex items-center justify-center 
        hover:border-toro-primary/40 transition-colors
        ${className}
      `}
      title={showTooltip && username ? `${username}` : undefined}
    >
      <span className="select-none">{emoji}</span>
    </div>
  )
}
