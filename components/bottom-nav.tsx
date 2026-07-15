"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Dumbbell, Shield, BarChart2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/groups", label: "Grupos", icon: Shield },
  { href: "/reports", label: "Reportes", icon: BarChart2 },
  { href: "/mi-rutina", label: "Rutina", icon: Dumbbell },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-white/95 border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 backdrop-blur-sm">
      <div className="max-w-md mx-auto">
        <div className="flex items-end h-16 px-2 relative">
          <div className="flex flex-1 justify-around">
            {navItems.slice(0, 2).map((item) => {
              const isActive =
                (pathname === "/" && item.href === "/") || (pathname.startsWith(item.href) && item.href !== "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 px-3 transition-all duration-200 min-w-[50px] rounded-xl relative",
                    isActive
                      ? "text-toro-primary scale-105"
                      : "text-gray-400 hover:text-toro-primary/70 hover:bg-gray-50",
                  )}
                >
                  <item.icon className={cn("transition-all", isActive ? "w-5 h-5" : "w-4 h-4")} />
                  <span className={cn("font-semibold text-[9px] leading-tight", isActive && "font-bold")}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="flex flex-col items-center -mb-3 px-3">
            <Link
              href="/log"
              className="bg-gradient-to-br from-toro-accent via-toro-accent to-toro-primary hover:from-toro-primary hover:to-toro-accent text-white rounded-2xl w-16 h-16 flex items-center justify-center shadow-[0_8px_24px_rgba(255,107,107,0.35)] transition-all duration-300 hover:scale-110 hover:shadow-[0_12px_32px_rgba(255,107,107,0.45)] mb-1 ring-4 ring-white"
            >
              <Plus className="w-7 h-7" strokeWidth={2.5} />
            </Link>
            <span className="text-[9px] font-bold text-toro-accent tracking-wide">REGISTRAR</span>
          </div>

          <div className="flex flex-1 justify-around">
            {navItems.slice(2).map((item) => {
              const isActive =
                (pathname === "/" && item.href === "/") || (pathname.startsWith(item.href) && item.href !== "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 px-3 transition-all duration-200 min-w-[50px] rounded-xl",
                    isActive
                      ? "text-toro-primary scale-105"
                      : "text-gray-400 hover:text-toro-primary/70 hover:bg-gray-50",
                  )}
                >
                  <item.icon className={cn("transition-all", isActive ? "w-5 h-5" : "w-4 h-4")} />
                  <span className={cn("font-semibold text-[9px] leading-tight", isActive && "font-bold")}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
