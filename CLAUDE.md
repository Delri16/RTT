# CLAUDE.md

Guía para trabajar en este repo con Claude Code. Para el detalle completo de dominio (tablas, funciones de `lib/actions.ts`, flujos) ver [PROYECTO_CONTEXTO.md](PROYECTO_CONTEXTO.md) — este archivo no lo duplica, solo agrega lo operativo.

## Qué es esto

RTT ("Road To Toro" / ToroApp) es una PWA mobile-first para trackear actividades físicas en grupo: grupos, registro de actividades con puntos, rankings, "rodeos" (duelos 1v1 semanales), reportes de peso, logros, tags entre usuarios y notificaciones. Generada originalmente con v0 (Vercel), ahora se trabaja localmente.

**Stack:** Next.js 14.2.35 (App Router) + React 19 + TypeScript, Tailwind + shadcn/ui, Supabase (Postgres) como backend. Login por username + email con código OTP (Supabase Auth) — ver sección abajo.

## Setup local

```bash
npm install --legacy-peer-deps
npm run dev
```

`--legacy-peer-deps` es obligatorio: `react@19` no matchea el peer `react@^18` que pide `next@14.2.35`. Es un conflicto preexistente del proyecto v0, no algo para "arreglar" subiendo/bajando versiones sin que te lo pidan.

Variables de entorno (Supabase) — ver la lista completa en `PROYECTO_CONTEXTO.md`. Sin ellas, todo lo que dependa de `lib/supabase.ts` falla; la landing en `/` no las necesita.

## Estado actual: modo landing (temporal)

Hoy la ruta raíz `/` **no** muestra el dashboard/login de la app real: muestra una landing de espera (cuenta regresiva al regreso + encuesta de features para "RTT2"). Esto es intencional y temporal, mientras se decide cuándo volver a exponer la app.

Cómo está armado, sin borrar ni romper nada de la app original:

- [components/app-shell.tsx](components/app-shell.tsx): client component que decide, según el pathname, si monta `AppProvider` (login gate + BottomNav + listeners de Supabase) o no. En `/` no lo monta — así la landing no dispara ninguna llamada a Supabase ni depende de sesión.
- [app/layout.tsx](app/layout.tsx): quedó minimal, delega todo el shell condicional a `AppShell`.
- [app/page.tsx](app/page.tsx): ahora renderiza `LandingPage` en vez de `DashboardPage`.
- Todas las demás rutas (`/dashboard`, `/groups`, `/log`, etc.) siguen intactas y funcionando exactamente igual que antes — `AppShell` les sigue aplicando `AppProvider` normalmente.

**Para volver a la app real en `/`:** restaurar `app/page.tsx` a que renderice `DashboardPage` bajo `useApp()` (ver historial de git) y opcionalmente eliminar la rama especial de `AppShell` si ya no hace falta la landing.

### Landing (`components/landing/`)

- `landing-page.tsx`: composición general (logo, título, countdown, sección de encuesta).
- `countdown.tsx`: cuenta regresiva client-side hasta **lunes 20 de julio 2026, 00:01 (hora Argentina, UTC-3)**. La fecha está hardcodeada en `TARGET_DATE`.
- `feature-vote-form.tsx`: lista de features actuales de la app (hardcodeada en el array `FEATURES`, derivada de `PROYECTO_CONTEXTO.md`) con voto Sí/No/Me da igual por feature + textarea libre. Al enviar, pega un único POST a `/api/feedback`.

### API route de feedback

[app/api/feedback/route.ts](app/api/feedback/route.ts) arma un solo mensaje de texto con todos los votos + el comentario libre y lo postea al webhook de Discord (hardcodeado ahí mismo, a pedido). Server-side a propósito: evita exponer lógica de formato en el bundle del cliente y evita cualquier tema de CORS con Discord.

Si en algún momento se agregan más features a la app, actualizar el array `FEATURES` en `feature-vote-form.tsx` para que la encuesta siga reflejando la realidad.

## Login: username + email con OTP (Supabase Auth)

El login dejó de ser "solo username". Ahora (`components/login-screen.tsx`):

1. El usuario ingresa username + email.
2. `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` manda un código de 6 dígitos al mail, usando el SMTP que tenga configurado el proyecto Supabase (Project Settings → Auth → SMTP). **Esto no está probado contra el proyecto real** — este entorno no tiene acceso a ese proyecto Supabase vía MCP, así que hay que confirmar en Supabase que el SMTP esté andando y que las plantillas de "Magic Link / OTP" tengan el `{{ .Token }}` visible.
3. El usuario ingresa el código → `supabase.auth.verifyOtp(...)` → sesión de Supabase Auth creada.
4. `lib/actions.ts` → `linkProfileToAuthUser(username, email, authUserId)` crea o completa la fila en `profiles` (username sigue siendo la PK de negocio en todo el resto del código, no se tocó nada de eso).

Cuentas viejas (username sin email todavía): la primera vez que vuelvan a entrar pasan por el mismo flujo y `linkProfileToAuthUser` les completa `email`/`auth_user_id` sin perder su historial.

Sesión persistente ("nunca más se desloguea salvo manual"): es el comportamiento default de `supabase-js` (`persistSession` + `autoRefreshToken`), no hay nada custom armado para eso — `app/app-provider.tsx` solo lee `supabase.auth.getSession()` al montar y escucha `onAuthStateChange`. Logout real = `supabase.auth.signOut()` (en `app/logout/page.tsx`, sin cambios).

**Falta correr en Supabase:** [scripts/33-add-email-auth.sql](scripts/33-add-email-auth.sql) (agrega `profiles.email` y `profiles.auth_user_id`). No se aplicó automáticamente — correrlo a mano contra el proyecto real antes de probar el login nuevo.

## Convenciones existentes (no introducidas por este cambio)

- Colores de marca: `toro-background #FDF7E4`, `toro-foreground #3A3A3A`, `toro-primary #FF6B6B`, `toro-secondary #FFD166`, `toro-accent #06D6A0` (ver `tailwind.config.ts`).
- Contenedor mobile-first `max-w-md mx-auto` para todas las pantallas de la app (no aplica a la landing, que es full-width).
- Zona horaria Argentina (UTC-3) para todo cálculo de semanas/fechas (`lib/date-utils.ts`).
- `next.config.mjs` tiene `ignoreBuildErrors`/`ignoreDuringBuilds` en true — heredado de v0, no oculta nada que hayamos roto nosotros pero tampoco hay que confiarse: correr `tsc`/`eslint` a mano si se toca algo delicado.
