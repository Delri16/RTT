import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Skeleton de una tarjeta del feed (avatar + texto + puntos). */
export function FeedPostSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-black/5 overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="h-2.5 w-20 rounded-md" />
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-11 h-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4 rounded-md" />
          <Skeleton className="h-2.5 w-16 rounded-md" />
        </div>
        <Skeleton className="h-7 w-12 rounded-full" />
      </div>
    </div>
  )
}

/** Varias tarjetas del feed apiladas. */
export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <FeedPostSkeleton key={i} />
      ))}
    </div>
  )
}

/** Filas de lista genéricas (grupos, ranking, ejercicios, etc.). */
export function ListSkeleton({
  count = 5,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 bg-white rounded-2xl shadow-soft border border-black/5 p-3"
        >
          <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2 rounded-md" />
            <Skeleton className="h-2.5 w-1/3 rounded-md" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Tarjetas de estadística (perfil / rutina). */
export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-soft border border-black/5 p-4 space-y-2"
        >
          <Skeleton className="h-6 w-12 rounded-md mx-auto" />
          <Skeleton className="h-2.5 w-16 rounded-md mx-auto" />
        </div>
      ))}
    </div>
  )
}
