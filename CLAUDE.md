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

## Puntos dinámicos según objetivo de peso

Cada usuario tiene un objetivo (`profiles.goal`: `lose`/`gain`/`maintain`, default `maintain`) y cada actividad una composición (`group_activities.aerobic_pct`: 0-100, default 50 = neutro). Al registrar, `logActivity` ajusta los puntos con `applyGoalMultiplier` (fórmula en [lib/points.ts](lib/points.ts) — módulo puro, `GOAL_K = 0.15`, importable desde cliente y server porque `actions.ts` es `"use server"` y no puede exportar helpers sync):

- Aeróbico premia a quien busca bajar; fuerza premia a quien busca subir; `maintain` no ajusta.
- `multiplicador = 1 + 0.15 * dirección * (aerobic_pct/100*2 - 1)`, con dirección `lose:+1 / gain:-1 / maintain:0`. Techo ±15%; una actividad 50/50 nunca se mueve.
- Se aplica también por cada actividad relacionada en `logRelatedActivity` (cada una con su propio `aerobic_pct`).

UI: selector de objetivo en el perfil ([app/profile/page.tsx](app/profile/page.tsx)); slider aeróbico/fuerza al crear ([app/groups/[id]/activities/create/page.tsx](app/groups/[id]/activities/create/page.tsx)) y editar ([components/activity-manager.tsx](components/activity-manager.tsx)) actividades.

**Falta correr en Supabase:** [scripts/36-add-goal-and-aerobic.sql](scripts/36-add-goal-and-aerobic.sql) (agrega `profiles.goal` y `group_activities.aerobic_pct`). Sin esto, crear/editar actividades falla al insertar `aerobic_pct`. Las ~1091 actividades existentes quedan en `aerobic_pct = 50` (neutro), así que no cambian de puntaje hasta configurarlas.

El objetivo solo se puede cambiar 1 vez por mes: `profiles.goal_updated_at` guarda la fecha del último cambio real de `goal` (no se toca si se reenvía el mismo valor). `updateProfile` en [lib/actions.ts](lib/actions.ts) rechaza el update si no pasó un mes desde `goal_updated_at`; el selector en [app/profile/page.tsx](app/profile/page.tsx) además deshabilita visualmente las otras opciones mientras el cambio está bloqueado. **Falta correr en Supabase:** [scripts/39-add-goal-updated-at.sql](scripts/39-add-goal-updated-at.sql) (agrega la columna `profiles.goal_updated_at`).

## Mi Rutina (rutinas de gimnasio + PRs)

Sección personal para armar rutinas de gym, entrenar registrando series (peso/reps) y compartir récords (PR) al feed. Se accede desde el botón **Rutina** del footer (reemplaza al viejo botón Inicio: a Inicio ahora se llega tocando el logo de arriba, ver [components/bottom-nav.tsx](components/bottom-nav.tsx) y [components/routine/routine-header.tsx](components/routine/routine-header.tsx)).

- **Catálogo de ejercicios:** estático en `public/ejercicios.json` (870 ejercicios con traducción ES, nivel de `fame` 1/2/3 e imágenes en `public/exercises/<id>/<n>.jpg`). Nunca se importa en el bundle: se baja con `fetch` y se cachea en memoria. Toda la lógica de filtros/búsqueda/traducción vive en [lib/exercise-catalog.ts](lib/exercise-catalog.ts) (módulo puro, client-side). Por defecto se listan solo los `fame 1` (94, "Populares"); el segmentado suma `fame 2` ("Comunes") y `fame 3` ("Todos"). Búsqueda por nombre ES/EN, filtros por músculo/equipo/categoría/nivel/tipo/fuerza.
- **Rutinas:** tabla `routines` con los ejercicios en una columna `jsonb` (no tabla aparte) para reordenar fácil. UI en [components/routine/](components/routine/): `routine-hub`, `routine-builder`, `routine-detail`, `workout-session`, `exercise-catalog`, `exercise-detail-drawer`, `pr-celebration`. Rutas en `app/mi-rutina/`.
- **Registro de series:** cada serie completada va a `workout_sets` vía `logWorkoutSet` (en [lib/actions.ts](lib/actions.ts)), que detecta PR (peso > máximo previo de ese ejercicio) y devuelve `isPR` + peso anterior.
- **PRs compartibles:** al superar tu récord aparece un cartel (`pr-celebration.tsx`) que permite compartirlo al feed con `sharePR` → inserta una fila en `shared_prs` por cada grupo del usuario (agrupadas por `share_id` para no duplicar en el feed del autor). El feed (`getGroupFeed` + [components/feed/feed-post.tsx](components/feed/feed-post.tsx)) tiene un nuevo tipo `pr`.

**Falta correr en Supabase:** [scripts/37-add-routines.sql](scripts/37-add-routines.sql) (crea `routines`, `workout_sets`, `shared_prs`). Sin esto, el hub de Mi Rutina carga vacío (las lecturas fallan silenciosamente y muestran estado vacío, no rompen), pero crear rutinas / registrar series / compartir PRs falla hasta correrlo. El feed sigue andando aunque falte la tabla `shared_prs` (la query devuelve vacío).

### Favoritos + registro suelto (sin rutina)

El hub de Mi Rutina (`routine-hub.tsx`) tiene un segmentado **Rutinas / Favoritos**. En "Favoritos" (`components/routine/favorites-tab.tsx`) se listan los ejercicios marcados con la estrella (`components/routine/favorite-button.tsx`, disponible en el catálogo y en el drawer de detalle) — tocar uno abre `components/routine/exercise-progress-drawer.tsx`, que permite registrar series peso/reps sueltas (`logWorkoutSet` con `routine_id: null`, reutiliza la misma tabla `workout_sets` y la misma detección de PR/`sharePR` que el flujo de rutinas) y muestra un gráfico de progreso de peso por fecha con `recharts` (ya era dependencia del proyecto).

**Falta correr en Supabase:** [scripts/38-add-favorite-exercises.sql](scripts/38-add-favorite-exercises.sql) (crea `favorite_exercises`, único por `username`+`exercise_id`). Sin esto, marcar/desmarcar favoritos falla silenciosamente y la tab "Favoritos" siempre aparece vacía. **(Ya corrido en el proyecto real.)**

Rutinas, favoritos y `workout_sets` son públicos para lectura: las funciones de `lib/actions.ts` (`getRoutines`, `getFavoriteExercises`, `getPersonalRecords`, `getWorkoutStats`, `getExerciseHistory`) ya reciben `username` como parámetro sin chequear que sea el usuario logueado — funcionan igual para consultar a cualquier persona porque la policy RLS es permisiva. [app/profile/[username]/page.tsx](app/profile/[username]/page.tsx) expone esto en una tab **"Rutina"** (junto a "Perfil") usando [components/routine/public-routine-tab.tsx](components/routine/public-routine-tab.tsx): mismas stats/rutinas/favoritos que el hub propio pero 100% solo-lectura (sin registrar series, sin editar/borrar rutinas, sin compartir PR). Para eso, `exercise-progress-drawer.tsx` acepta un prop `readOnly` que oculta el formulario de carga, el botón de borrar serie y el cartel de compartir récord — se usa `readOnly` en el perfil ajeno y sin ese prop (registro habilitado) en el propio hub de Mi Rutina.

### Filtros sugeridos por el nombre de la rutina

Al crear/editar una rutina ([components/routine/routine-builder.tsx](components/routine/routine-builder.tsx)), el nombre se pasa como prop `suggestName` a [components/routine/exercise-catalog.tsx](components/routine/exercise-catalog.tsx). `detectRoutineFilters` (en [lib/exercise-catalog.ts](lib/exercise-catalog.ts), módulo puro) busca palabras clave en el nombre (ES/EN: push, pull, pecho, espalda, piernas/legs, hombros, bíceps, tríceps, etc.) usando word-boundary (`\bkeyword\b`, para que "pullover" no matchee "pull") y devuelve los músculos/fuerza "crudos" a filtrar + labels en español. Si hay match: el catálogo arranca con esos filtros aplicados y en la tab **"Comunes"** (fame ≤ 2 = populares + comunes), y muestra un cartel "Creemos que estos ejercicios son los que buscás (…)". El cartel tiene una X que desactiva la sugerencia (limpia los filtros y vuelve a fame 1). Es 100% client-side, no toca Supabase. El drawer del catálogo se remonta en cada apertura (vaul desmonta el contenido al cerrar), así que la detección siempre lee el nombre actual.

## Reacciones y comentarios en el feed

Los posts del feed de Inicio aceptan reacciones con emoji y comentarios, **solo para reportes de peso, rutinas compartidas y PRs compartidos** — las actividades sueltas quedan afuera a propósito (son demasiadas y ensuciarían el feed). Todo es público: cualquier miembro ve las reacciones y comentarios de todos.

- Tablas `post_reactions` y `post_comments` ([scripts/41-add-post-reactions-comments.sql](scripts/41-add-post-reactions-comments.sql)). La clave lógica es `(post_type, post_id)`, donde `post_type` es `report`/`routine`/`pr` y `post_id` es el mismo `id` que expone `FeedItem` — el id de fila para reportes, el `share_id` para rutinas y PRs (que se insertan una fila por grupo). Por eso `post_id` es TEXT sin FK: apunta a tablas distintas según el tipo.
- `post_reactions` tiene UNIQUE `(post_type, post_id, username, emoji)`: el toggle es insert/delete, una reacción por emoji por persona.
- Funciones en [lib/actions.ts](lib/actions.ts): `getPostsInteractions` (batch — 2 queries para toda la página de feed, no una por post), `togglePostReaction`, `getPostComments`, `addPostComment`, `deletePostComment` (chequea autoría a mano porque la RLS es permisiva).
- UI en [components/feed/post-interactions.tsx](components/feed/post-interactions.tsx): barra de emojis siempre visible (paleta fija en el array `REACTIONS`: 🐂 🔥 ❤️ 💀 🥷 💪 😂 🐐) con toggle optimista, y sección de comentarios que se carga lazy al abrirla. [home-feed.tsx](components/feed/home-feed.tsx) precarga las interacciones de cada página y se las pasa a `FeedPost` como prop `interactions`.

**Falta correr en Supabase:** [scripts/41-add-post-reactions-comments.sql](scripts/41-add-post-reactions-comments.sql). Sin esto, la barra de reacciones aparece pero siempre en cero y nada se guarda (las queries fallan en silencio); el feed sigue funcionando igual.

## Notificaciones

UI en [app/notifications/page.tsx](app/notifications/page.tsx) + campanita con badge en el header de [home-feed.tsx](components/feed/home-feed.tsx) ([components/notifications/notification-bell.tsx](components/notifications/notification-bell.tsx)). Usa las funciones ya existentes en `lib/actions.ts` (`getUserNotifications`, `getUnreadNotificationsCount`, `markNotificationAsRead`, `markAllNotificationsAsRead`) sobre la tabla `notifications` (creada en [scripts/19-create-activity-tags-system.sql](scripts/19-create-activity-tags-system.sql)).

Tipos de notificación (`notification_type`): los originales `activity_tag` / `activity_request` / `group_invite`, más 5 agregados en [scripts/40-notification-triggers.sql](scripts/40-notification-triggers.sql):

- `rank_overtake_general` / `rank_overtake_weekly`: se disparan solas via un trigger `AFTER INSERT ON user_activities` (`notify_rank_changes()`) — cubre tanto `logActivity` como `logRelatedActivity`, que insertan ahí sea cual sea el flujo. Comparan el total de cada rival del grupo antes/después de sumar la actividad; si algún rival quedó justo en el medio, lo acabás de pasar y se le notifica a él/ella. "Semana" = lunes 00:00 a domingo 23:59:59 en hora Argentina, mismo criterio que `getGroupRankingByWeek`.
- `rank_lead_general` / `rank_lead_weekly`: mismo trigger, pero te notifica a VOS cuando pasás a liderar el ranking (motivacional).
- `report_available`: se dispara con `notify_pending_reports()`, pensada para correr diaria por `pg_cron` (requiere habilitar la extensión en Database → Extensions del proyecto Supabase). Mismo criterio de "falta reporte" que `getUserReportStatus` (nunca reportó, o pasaron ≥15 días desde el último), con dedupe para no re-notificar en cada corrida del cron.

**Falta correr en Supabase:** [scripts/40-notification-triggers.sql](scripts/40-notification-triggers.sql) (amplía los CHECK constraints de `notification_type`/`has_related_entity`, crea el trigger de ranking y la función+cron de reportes). Sin esto, `getUserNotifications` sigue funcionando pero solo va a mostrar `activity_tag`/`activity_request`/`group_invite`; nunca aparecen los avisos de ranking ni de reporte. Si `pg_cron` no está habilitado en el proyecto, `notify_pending_reports()` queda creada pero sin programar — hay que habilitar la extensión o llamarla desde otro scheduler.

## Convenciones existentes (no introducidas por este cambio)

- Colores de marca: `toro-background #FDF7E4`, `toro-foreground #3A3A3A`, `toro-primary #FF6B6B`, `toro-secondary #FFD166`, `toro-accent #06D6A0` (ver `tailwind.config.ts`).
- Contenedor mobile-first `max-w-md mx-auto` para todas las pantallas de la app (no aplica a la landing, que es full-width).
- Zona horaria Argentina (UTC-3) para todo cálculo de semanas/fechas (`lib/date-utils.ts`).
- `next.config.mjs` tiene `ignoreBuildErrors`/`ignoreDuringBuilds` en true — heredado de v0, no oculta nada que hayamos roto nosotros pero tampoco hay que confiarse: correr `tsc`/`eslint` a mano si se toca algo delicado.
