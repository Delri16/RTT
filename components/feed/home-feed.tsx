"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Dumbbell, PlusCircle, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/app/app-provider"
import { getGroupFeed, type FeedItem } from "@/lib/actions"
import FeedPost from "@/components/feed/feed-post"
import NotificationBell from "@/components/notifications/notification-bell"
import { FeedSkeleton } from "@/components/ui/skeletons"

const PAGE_SIZE = 20

export default function HomeFeed() {
  const { username } = useApp()
  const [items, setItems] = useState<FeedItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [reachedEnd, setReachedEnd] = useState(false)
  const sentinel = useRef<HTMLDivElement | null>(null)

  const loadInitial = useCallback(async () => {
    if (!username) return
    setLoading(true)
    const res = await getGroupFeed(username, { limit: PAGE_SIZE })
    setItems(res.items)
    setCursor(res.nextCursor)
    setReachedEnd(!res.nextCursor)
    setLoading(false)
  }, [username])

  const loadMore = useCallback(async () => {
    if (!username || !cursor || loadingMore) return
    setLoadingMore(true)
    const res = await getGroupFeed(username, { limit: PAGE_SIZE, before: cursor })
    setItems((prev) => [...prev, ...res.items])
    setCursor(res.nextCursor)
    setReachedEnd(!res.nextCursor)
    setLoadingMore(false)
  }, [username, cursor, loadingMore])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: "400px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  return (
    <div className="bg-toro-background min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-toro-background/80 backdrop-blur-md border-b border-black/5">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 active:scale-95 transition" aria-label="Inicio">
            <Image src="/logo-header.png" alt="Road to Toro" width={36} height={36} className="rounded-lg shadow-soft" />
            <h1 className="text-xl font-display text-toro-foreground">Inicio</h1>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Link href="/profile">
              <Button variant="ghost" size="icon" aria-label="Perfil">
                <User className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-3 max-w-xl mx-auto">
        {loading ? (
          <FeedSkeleton count={5} />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {items.map((item, i) => (
              <div
                key={`${item.type}-${item.id}`}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}
              >
                <FeedPost item={item} />
              </div>
            ))}
            <div ref={sentinel} />
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Dumbbell className="animate-spin w-6 h-6 text-toro-primary/70" />
              </div>
            )}
            {reachedEnd && (
              <p className="text-center text-sm text-toro-foreground/40 py-6">Estás al día 🐂</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-5xl mb-4">🐂</div>
      <h2 className="text-xl font-display text-toro-foreground mb-2">Tu feed está vacío</h2>
      <p className="text-toro-foreground/60 mb-6">
        Unite a un grupo o registrá tu primera actividad para empezar a ver movimiento acá.
      </p>
      <div className="flex flex-col gap-2 max-w-xs mx-auto">
        <Link href="/log">
          <Button className="w-full bg-toro-primary hover:bg-toro-primary/90 text-white">
            <PlusCircle className="w-5 h-5 mr-2" /> Registrar actividad
          </Button>
        </Link>
        <Link href="/discover">
          <Button variant="outline" className="w-full bg-transparent">
            <Users className="w-5 h-5 mr-2" /> Descubrir grupos
          </Button>
        </Link>
      </div>
    </div>
  )
}
