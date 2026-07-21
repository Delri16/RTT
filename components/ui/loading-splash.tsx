import Image from "next/image"

/** Splash de carga de marca: logo con latido suave + puntos. Reemplaza los
 *  spinners de pantalla completa por algo más prolijo y con identidad. */
export default function LoadingSplash({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-toro-background gap-5">
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl bg-toro-primary/20 blur-xl animate-pulse-soft" />
        <div className="relative animate-float">
          <Image
            src="/logo-header.png"
            alt="Road to Toro"
            width={64}
            height={64}
            className="rounded-2xl shadow-soft-lg"
            priority
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-toro-primary animate-pulse-soft"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-toro-foreground/50 tracking-wide">{label}</p>
    </div>
  )
}
