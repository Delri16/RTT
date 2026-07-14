"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import type { ReactNode } from "react"

/**
 * Header estándar de la sección Mi Rutina.
 * El logo arriba a la izquierda linkea a Inicio ("/"): así se accede al feed
 * sin botón en el footer (el de Inicio se reemplazó por Rutina).
 */
export default function RoutineHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string
  subtitle?: string
  back?: boolean | string
  right?: ReactNode
}) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-20 bg-toro-background/90 backdrop-blur-md border-b border-black/5">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {back ? (
          <button
            onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
            aria-label="Volver"
            className="p-1.5 -ml-1 rounded-xl text-toro-foreground/70 hover:bg-black/5 active:scale-95 transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <Link href="/" aria-label="Ir al inicio" className="shrink-0 active:scale-95 transition">
            <Image src="/logo-header.png" alt="Inicio" width={34} height={34} className="rounded-lg" />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-display leading-tight text-toro-foreground truncate">{title}</h1>
          {subtitle && <p className="text-xs text-toro-foreground/50 truncate -mt-0.5">{subtitle}</p>}
        </div>

        {right}
      </div>
    </header>
  )
}
