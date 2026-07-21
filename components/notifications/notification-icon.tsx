import { Tag, Trophy, Crown, Users, ClipboardCheck, Camera, Bell } from "lucide-react"
import type { NotificationType } from "@/lib/actions"

const ICON_BY_TYPE: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  activity_tag: { icon: Tag, className: "text-toro-primary bg-toro-primary/10" },
  activity_request: { icon: ClipboardCheck, className: "text-toro-accent bg-toro-accent/10" },
  group_invite: { icon: Users, className: "text-toro-secondary bg-toro-secondary/10" },
  rank_overtake_weekly: { icon: Trophy, className: "text-red-500 bg-red-500/10" },
  rank_overtake_general: { icon: Trophy, className: "text-red-500 bg-red-500/10" },
  rank_lead_weekly: { icon: Crown, className: "text-toro-secondary bg-toro-secondary/10" },
  rank_lead_general: { icon: Crown, className: "text-toro-secondary bg-toro-secondary/10" },
  report_available: { icon: Camera, className: "text-toro-accent bg-toro-accent/10" },
}

export default function NotificationIcon({ type }: { type: NotificationType }) {
  const entry = ICON_BY_TYPE[type] ?? { icon: Bell, className: "text-toro-foreground/60 bg-black/5" }
  const Icon = entry.icon
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${entry.className}`}>
      <Icon className="w-5 h-5" />
    </div>
  )
}
