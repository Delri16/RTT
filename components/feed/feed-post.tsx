"use client"

import Link from "next/link"
import { Dumbbell, Scale, Clock, Trophy, ArrowUp } from "lucide-react"
import UserAvatar from "@/components/user-avatar"
import type { FeedItem } from "@/lib/actions"
import { timeAgo } from "@/lib/date-utils"

function PostHeader({ item }: { item: FeedItem }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-3">
      <Link href={`/profile/${item.username}`}>
        <UserAvatar avatarId={item.avatar || "default"} username={item.username} size="md" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/profile/${item.username}`} className="font-bold text-toro-foreground leading-tight hover:underline">
          {item.username}
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-toro-foreground/50">
          {item.groupName && <span className="truncate">{item.groupName}</span>}
          <span>·</span>
          <span className="whitespace-nowrap">{timeAgo(item.ts)}</span>
        </div>
      </div>
    </div>
  )
}

export default function FeedPost({ item }: { item: FeedItem }) {
  if (item.type === "activity") {
    return (
      <article className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <PostHeader item={item} />
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-11 h-11 rounded-xl bg-toro-primary/10 flex items-center justify-center shrink-0">
            <Dumbbell className="w-6 h-6 text-toro-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-toro-foreground">
              Registró <span className="font-semibold">{item.activityName || "una actividad"}</span>
            </p>
            {item.minutes ? (
              <p className="text-xs text-toro-foreground/50 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {item.minutes} min
              </p>
            ) : null}
          </div>
          <div className="shrink-0 rounded-full bg-toro-accent/15 text-toro-accent font-bold text-sm px-3 py-1">
            +{item.points}
          </div>
        </div>
      </article>
    )
  }

  if (item.type === "pr") {
    return (
      <article className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <PostHeader item={item} />
        <div className="mx-4 mb-3 mt-1 rounded-xl bg-gradient-to-br from-toro-secondary/25 to-toro-accent/15 p-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Trophy className="w-6 h-6 text-toro-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-toro-accent">Nuevo récord 🎉</p>
              <p className="text-toro-foreground leading-tight">
                <span className="font-semibold">{item.exerciseName}</span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-2xl text-toro-foreground leading-none">
                {item.weight}
                <span className="text-xs text-toro-foreground/40 ml-0.5">kg</span>
              </div>
              <div className="text-[11px] text-toro-foreground/50">× {item.reps} reps</div>
            </div>
          </div>
          {item.prevWeight != null && item.weight > item.prevWeight && (
            <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-toro-accent">
              <ArrowUp className="w-3.5 h-3.5" />
              +{Math.round((item.weight - item.prevWeight) * 10) / 10} kg vs su récord anterior ({item.prevWeight} kg)
            </div>
          )}
        </div>
      </article>
    )
  }

  // report
  const photos = [item.scalePhotoUrl, item.bodyPhotoUrl].filter(Boolean) as string[]
  return (
    <article className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <PostHeader item={item} />
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-11 h-11 rounded-xl bg-toro-secondary/20 flex items-center justify-center shrink-0">
          <Scale className="w-6 h-6 text-toro-foreground/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-toro-foreground">
            Subió su reporte de peso: <span className="font-semibold">{item.weight} kg</span>
          </p>
        </div>
        <div className="shrink-0 rounded-full bg-toro-accent/15 text-toro-accent font-bold text-sm px-3 py-1">
          +{item.points}
        </div>
      </div>
      {photos.length > 0 && (
        <div className={`grid gap-0.5 ${photos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {photos.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url || "/placeholder.svg"}
              alt="Foto del reporte"
              loading="lazy"
              className="w-full aspect-square object-cover bg-toro-background"
            />
          ))}
        </div>
      )}
    </article>
  )
}
