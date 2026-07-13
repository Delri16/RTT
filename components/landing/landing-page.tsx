import Image from "next/image"
import { Countdown } from "@/components/landing/countdown"
import { FeatureVoteForm } from "@/components/landing/feature-vote-form"
import { SecretAppKey } from "@/components/landing/secret-app-key"

export function LandingPage() {
  return (
    <main className="min-h-screen bg-toro-background flex flex-col items-center px-4 py-10 sm:py-16">
      <SecretAppKey />
      <div className="w-full max-w-2xl flex flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="Road To Toro"
          width={140}
          height={140}
          priority
          className="mb-6 drop-shadow-lg"
        />

        <h1 className="font-display text-3xl sm:text-5xl text-toro-foreground leading-tight text-balance">
          El regreso de los toros
        </h1>
        <p className="mt-2 text-toro-foreground/60 font-medium">
          Lunes 20 de julio, 00:01
        </p>

        <div className="mt-8">
          <Countdown />
        </div>

        <div className="mt-16 w-full">
          <h2 className="font-display text-2xl sm:text-3xl text-toro-foreground text-balance">
            ¿Qué te gustaría ver en RTT2?
          </h2>
          <p className="mt-2 text-toro-foreground/60">
            Votá las features actuales y contanos qué sumarías para la nueva versión.
          </p>

          <div className="mt-8 text-left">
            <FeatureVoteForm />
          </div>
        </div>
      </div>
    </main>
  )
}
