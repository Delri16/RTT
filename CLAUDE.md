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

## Estado actual: la app, no la landing

⚠️ **Esta sección decía que `/` mostraba una landing de espera. Ya no es así** (verificado 25/8/2026): [app/page.tsx](app/page.tsx) renderiza `HomeFeed` bajo `useApp()`, y [components/app-shell.tsx](components/app-shell.tsx) monta `AppProvider` en **todas** las rutas, sin rama especial por pathname. O sea: toda la app está detrás del login gate, incluida `/`.

Los componentes de la landing siguen en el repo (`components/landing/`) pero no los usa ninguna ruta. Si alguna vez hay que volver a exponerla, se apunta `app/page.tsx` a `LandingPage` y se le agrega a `AppShell` la rama que saltee `AppProvider` para ese pathname.

### Landing sin usar (`components/landing/`)

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

**Ya corrido en el proyecto real:** [scripts/33-add-email-auth.sql](scripts/33-add-email-auth.sql) (agrega `profiles.email` y `profiles.auth_user_id`).

> **Nota sobre migraciones:** el estado de TODOS los scripts 33-43 se verificó contra la DB real el 27/7/2026: están todos aplicados. Lo único pendiente en Supabase es habilitar la extensión `pg_cron` (ver sección Notificaciones). Las migraciones se pueden aplicar/verificar directo con la connection string `POSTGRES_URL` de `.env.local` (paquete `pg` de npm; sacarle el `?sslmode=require` a la URL y pasar `ssl: { rejectUnauthorized: false }`).

## Puntos dinámicos según objetivo de peso

Cada usuario tiene un objetivo (`profiles.goal`: `lose`/`gain`/`maintain`, default `maintain`) y cada actividad una composición (`group_activities.aerobic_pct`: 0-100, default 50 = neutro). Al registrar, `logActivity` ajusta los puntos con `applyGoalMultiplier` (fórmula en [lib/points.ts](lib/points.ts) — módulo puro, `GOAL_K = 0.15`, importable desde cliente y server porque `actions.ts` es `"use server"` y no puede exportar helpers sync):

- Aeróbico premia a quien busca bajar; fuerza premia a quien busca subir; `maintain` no ajusta.
- `multiplicador = 1 + 0.15 * dirección * (aerobic_pct/100*2 - 1)`, con dirección `lose:+1 / gain:-1 / maintain:0`. Techo ±15%; una actividad 50/50 nunca se mueve.
- Se aplica también por cada actividad relacionada en `logRelatedActivity` (cada una con su propio `aerobic_pct`).

UI: selector de objetivo en el perfil ([app/profile/page.tsx](app/profile/page.tsx)); slider aeróbico/fuerza al crear ([app/groups/[id]/activities/create/page.tsx](app/groups/[id]/activities/create/page.tsx)) y editar ([components/activity-manager.tsx](components/activity-manager.tsx)) actividades.

**Ya corrido en el proyecto real:** [scripts/36-add-goal-and-aerobic.sql](scripts/36-add-goal-and-aerobic.sql) (agrega `profiles.goal` y `group_activities.aerobic_pct`). Las ~1091 actividades preexistentes quedaron en `aerobic_pct = 50` (neutro), así que no cambian de puntaje hasta configurarlas.

El objetivo solo se puede cambiar 1 vez por mes: `profiles.goal_updated_at` guarda la fecha del último cambio real de `goal` (no se toca si se reenvía el mismo valor). `updateProfile` en [lib/actions.ts](lib/actions.ts) rechaza el update si no pasó un mes desde `goal_updated_at`; el selector en [app/profile/page.tsx](app/profile/page.tsx) además deshabilita visualmente las otras opciones mientras el cambio está bloqueado. **Ya corrido en el proyecto real:** [scripts/39-add-goal-updated-at.sql](scripts/39-add-goal-updated-at.sql) (agrega la columna `profiles.goal_updated_at`).

## Mi Rutina (rutinas de gimnasio + PRs)

Sección personal para armar rutinas de gym, entrenar registrando series (peso/reps) y compartir récords (PR) al feed. Se accede desde el botón **Rutina** del footer (reemplaza al viejo botón Inicio: a Inicio ahora se llega tocando el logo de arriba, ver [components/bottom-nav.tsx](components/bottom-nav.tsx) y [components/routine/routine-header.tsx](components/routine/routine-header.tsx)).

- **Catálogo de ejercicios:** estático en `public/ejercicios.json` (870 ejercicios con traducción ES, nivel de `fame` 1/2/3 e imágenes en `public/exercises/<id>/<n>.jpg`). Nunca se importa en el bundle: se baja con `fetch` y se cachea en memoria. Toda la lógica de filtros/búsqueda/traducción vive en [lib/exercise-catalog.ts](lib/exercise-catalog.ts) (módulo puro, client-side). Por defecto se listan solo los `fame 1` (94, "Populares"); el segmentado suma `fame 2` ("Comunes") y `fame 3` ("Todos"). Búsqueda por nombre ES/EN, filtros por músculo/equipo/categoría/nivel/tipo/fuerza.
- **Rutinas:** tabla `routines` con los ejercicios en una columna `jsonb` (no tabla aparte) para reordenar fácil. UI en [components/routine/](components/routine/): `routine-hub`, `routine-builder`, `routine-detail`, `workout-session`, `exercise-catalog`, `exercise-detail-drawer`, `pr-celebration`. Rutas en `app/mi-rutina/`.
- **Registro de series:** cada serie completada va a `workout_sets` vía `logWorkoutSet` (en [lib/actions.ts](lib/actions.ts)), que detecta PR (peso > máximo previo de ese ejercicio) y devuelve `isPR` + peso anterior.
- **PRs compartibles:** al superar tu récord aparece un cartel (`pr-celebration.tsx`) que permite compartirlo al feed con `sharePR` → inserta una fila en `shared_prs` por cada grupo del usuario (agrupadas por `share_id` para no duplicar en el feed del autor). El feed (`getGroupFeed` + [components/feed/feed-post.tsx](components/feed/feed-post.tsx)) tiene un nuevo tipo `pr`.

**Ya corrido en el proyecto real:** [scripts/37-add-routines.sql](scripts/37-add-routines.sql) (crea `routines`, `workout_sets`, `shared_prs`).

### Favoritos + registro suelto (sin rutina)

El hub de Mi Rutina (`routine-hub.tsx`) tiene un segmentado **Rutinas / Favoritos**. En "Favoritos" (`components/routine/favorites-tab.tsx`) se listan los ejercicios marcados con la estrella (`components/routine/favorite-button.tsx`, disponible en el catálogo y en el drawer de detalle) — tocar uno abre `components/routine/exercise-progress-drawer.tsx`, que permite registrar series peso/reps sueltas (`logWorkoutSet` con `routine_id: null`, reutiliza la misma tabla `workout_sets` y la misma detección de PR/`sharePR` que el flujo de rutinas) y muestra un gráfico de progreso de peso por fecha con `recharts` (ya era dependencia del proyecto).

**Falta correr en Supabase:** [scripts/38-add-favorite-exercises.sql](scripts/38-add-favorite-exercises.sql) (crea `favorite_exercises`, único por `username`+`exercise_id`). Sin esto, marcar/desmarcar favoritos falla silenciosamente y la tab "Favoritos" siempre aparece vacía. **(Ya corrido en el proyecto real.)**

Rutinas, favoritos y `workout_sets` son públicos para lectura: las funciones de `lib/actions.ts` (`getRoutines`, `getFavoriteExercises`, `getPersonalRecords`, `getWorkoutStats`, `getExerciseHistory`) ya reciben `username` como parámetro sin chequear que sea el usuario logueado — funcionan igual para consultar a cualquier persona porque la policy RLS es permisiva. [app/profile/[username]/page.tsx](app/profile/[username]/page.tsx) expone esto en una tab **"Rutina"** (junto a "Perfil") usando [components/routine/public-routine-tab.tsx](components/routine/public-routine-tab.tsx): mismas stats/rutinas/favoritos que el hub propio pero 100% solo-lectura (sin registrar series, sin editar/borrar rutinas, sin compartir PR). Para eso, `exercise-progress-drawer.tsx` acepta un prop `readOnly` que oculta el formulario de carga, el botón de borrar serie y el cartel de compartir récord — se usa `readOnly` en el perfil ajeno y sin ese prop (registro habilitado) en el propio hub de Mi Rutina.

### Filtros sugeridos por el nombre de la rutina

Al crear/editar una rutina ([components/routine/routine-builder.tsx](components/routine/routine-builder.tsx)), el nombre se pasa como prop `suggestName` a [components/routine/exercise-catalog.tsx](components/routine/exercise-catalog.tsx). `detectRoutineFilters` (en [lib/exercise-catalog.ts](lib/exercise-catalog.ts), módulo puro) busca palabras clave en el nombre (ES/EN: push, pull, pecho, espalda, piernas/legs, hombros, bíceps, tríceps, etc.) usando word-boundary (`\bkeyword\b`, para que "pullover" no matchee "pull") y devuelve los músculos/fuerza "crudos" a filtrar + labels en español. Si hay match: el catálogo arranca con esos filtros aplicados y en la tab **"Comunes"** (fame ≤ 2 = populares + comunes), y muestra un cartel "Creemos que estos ejercicios son los que buscás (…)". El cartel tiene una X que desactiva la sugerencia (limpia los filtros y vuelve a fame 1). Es 100% client-side, no toca Supabase. El drawer del catálogo se remonta en cada apertura (vaul desmonta el contenido al cerrar), así que la detección siempre lee el nombre actual.

## Veredicto de los reportes de peso en el feed

Cada post de reporte en el feed de Inicio ([components/feed/feed-post.tsx](components/feed/feed-post.tsx)) lleva debajo un cartel grande de color con el veredicto: **verde** si cumplió su objetivo, **amarillo** si quedó a mitad de camino, **rojo** si fue para el lado contrario. Además el borde del post entero se tiñe del color del veredicto (`VERDICT_RING`) para que se note desde el scroll. El texto es a propósito exagerado: felicita fuerte al que cumplió y bardea al que no ("dejá de comer" / "ponete a comer").

- **Lógica:** [lib/report-verdict.ts](lib/report-verdict.ts) → `getReportVerdict({ weight, prevWeight, goal, seed })`. Módulo PURO (como `lib/points.ts`) para poder importarlo desde cliente y server. Compara el peso reportado contra el reporte anterior de esa persona y clasifica según `profiles.goal`:
  - `lose`: bajar ≥ 0,3 kg = verde, |dif| < 0,3 kg ("pesa lo mismo") = amarillo, subir = rojo.
  - `gain`: al revés (subir = verde, bajar = rojo).
  - `maintain`: |dif| < 0,5 kg = verde, 0,5–3 kg = amarillo, > 3 kg = rojo. **Ojo:** el pedido original decía "0,5 a 1 amarillo, más de 3 rojo" — el tramo 1–3 kg quedó amarillo con intensidad 2 (burla más fuerte) para no dejar un hueco sin clasificar.
  - `intensity` 1/2/3 según la magnitud del cambio: escala el diseño (borde más grueso, delta más grande, ícono pulsante) y elige burlas/felicitaciones más extremas.
  - Las burlas salen del diccionario `MESSAGES` (varias por combinación objetivo × nivel × intensidad) y se eligen con un **hash del id del reporte**, no con `Math.random`: el mismo post siempre muestra el mismo texto (nada de mismatch de hidratación).
  - Sin reporte anterior el nivel es `neutral` ("PRIMER REPORTE", marca base) — hoy en la DB real los 7 reportes existentes son todos primeros, así que hasta la segunda ronda de reportes no se ven veredictos de color.
- **Datos:** el `FeedItem` de tipo `report` que devuelve `getGroupFeed` ahora incluye `goal` (viene de la misma query de avatares en `profiles`) y `prevWeight`. `prevWeight` sale de una única query extra a `bi_weekly_reports` para toda la página: se prefiere el reporte anterior **del mismo grupo** y, si en ese grupo es el primero, cae al último de cualquier otro grupo del usuario (es el mismo peso de la misma persona).
- **UI:** [components/feed/report-verdict-card.tsx](components/feed/report-verdict-card.tsx) (recibe el veredicto ya calculado como prop, así el post y el cartel comparten el mismo color).

Recordar que `profiles.goal` default es `maintain`: quien nunca eligió objetivo se juzga con los umbrales de mantenerse.

## Reacciones y comentarios en el feed

Los posts del feed de Inicio aceptan reacciones con emoji y comentarios, **solo para reportes de peso, rutinas compartidas y PRs compartidos** — las actividades sueltas quedan afuera a propósito (son demasiadas y ensuciarían el feed). Todo es público: cualquier miembro ve las reacciones y comentarios de todos.

- Tablas `post_reactions` y `post_comments` ([scripts/41-add-post-reactions-comments.sql](scripts/41-add-post-reactions-comments.sql)). La clave lógica es `(post_type, post_id)`, donde `post_type` es `report`/`routine`/`pr` y `post_id` es el mismo `id` que expone `FeedItem` — el id de fila para reportes, el `share_id` para rutinas y PRs (que se insertan una fila por grupo). Por eso `post_id` es TEXT sin FK: apunta a tablas distintas según el tipo.
- **Una sola reacción por persona por post**: UNIQUE `(post_type, post_id, username)` — lo pone [scripts/42-one-reaction-per-user.sql](scripts/42-one-reaction-per-user.sql), que reemplaza el UNIQUE original de 41 (que incluía el emoji y permitía marcar uno de cada tipo). Tocar el mismo emoji saca la reacción, tocar otro la reemplaza (`setPostReaction` hace delete o update, no insert siempre).
- Funciones en [lib/actions.ts](lib/actions.ts): `getPostsInteractions` (batch — 2 queries para toda la página de feed, no una por post; devuelve conteos por emoji, la reacción propia y los últimos 2 comentarios), `setPostReaction`, `getPostReactors`, `getPostComments`, `addPostComment`, `deletePostComment` (chequea autoría a mano porque la RLS es permisiva).
- UI en [components/feed/post-interactions.tsx](components/feed/post-interactions.tsx): dos botones — **Reaccionar** (abre un `Popover` con la paleta del array `REACTIONS`) y **comentarios** con el contador. Al lado va el resumen de cuántas reacciones tiene cada emoji (tocar un chip también reacciona). Debajo se ven hasta 2 comentarios precargados y un "Ver los N comentarios" que expande la lista completa + el campo para comentar. Todo optimista. [home-feed.tsx](components/feed/home-feed.tsx) precarga las interacciones de cada página y se las pasa a `FeedPost` como prop `interactions`.

**Ya corridos en el proyecto real (en orden):** [41-add-post-reactions-comments.sql](scripts/41-add-post-reactions-comments.sql) → [42-one-reaction-per-user.sql](scripts/42-one-reaction-per-user.sql).

### Notificaciones por reacciones y comentarios

Cuando alguien reacciona o comenta un post ajeno, el autor recibe una notificación in-app (tipos `post_reaction` / `post_comment`) **y un Web Push al teléfono** (ver sección Web Push). Lo hace `notifyPostInteraction` en [lib/actions.ts](lib/actions.ts), llamado desde `setPostReaction` (solo en la primera reacción de la persona: reemplazar el emoji no re-notifica) y `addPostComment` (siempre, con extracto de 80 chars). Nunca se notifican interacciones con posts propios, y es best-effort: si falla, la reacción/comentario ya quedó guardado. `resolveInteractivePost` resuelve autor+grupo según el tipo (`bi_weekly_reports` por id; `shared_routines`/`shared_prs` por `share_id` con fallback a id de fila). En [app/notifications/page.tsx](app/notifications/page.tsx) estas notificaciones linkean al feed de Inicio (`/`), no al grupo. **Ya corrido en el proyecto real:** [scripts/43-post-interaction-notifications-and-push.sql](scripts/43-post-interaction-notifications-and-push.sql) (amplía los CHECK de `notifications` y crea `push_subscriptions`).

## Notificaciones

UI en [app/notifications/page.tsx](app/notifications/page.tsx) + campanita con badge en el header de [home-feed.tsx](components/feed/home-feed.tsx) ([components/notifications/notification-bell.tsx](components/notifications/notification-bell.tsx)). Usa las funciones ya existentes en `lib/actions.ts` (`getUserNotifications`, `getUnreadNotificationsCount`, `markNotificationAsRead`, `markAllNotificationsAsRead`) sobre la tabla `notifications` (creada en [scripts/19-create-activity-tags-system.sql](scripts/19-create-activity-tags-system.sql)).

Tipos de notificación (`notification_type`): los originales `activity_tag` / `activity_request` / `group_invite`, más 5 agregados en [scripts/40-notification-triggers.sql](scripts/40-notification-triggers.sql):

- `rank_overtake_general` / `rank_overtake_weekly`: se disparan solas via un trigger `AFTER INSERT ON user_activities` (`notify_rank_changes()`) — cubre tanto `logActivity` como `logRelatedActivity`, que insertan ahí sea cual sea el flujo. Comparan el total de cada rival del grupo antes/después de sumar la actividad; si algún rival quedó justo en el medio, lo acabás de pasar y se le notifica a él/ella. "Semana" = lunes 00:00 a domingo 23:59:59 en hora Argentina, mismo criterio que `getGroupRankingByWeek`.
- `rank_lead_general` / `rank_lead_weekly`: mismo trigger, pero te notifica a VOS cuando pasás a liderar el ranking (motivacional).
- `report_available`: se dispara con `notify_pending_reports()`, pensada para correr diaria por `pg_cron` (requiere habilitar la extensión en Database → Extensions del proyecto Supabase). Mismo criterio de "falta reporte" que `getUserReportStatus` (nunca reportó, o pasaron ≥14 días desde el último), con dedupe para no re-notificar en cada corrida del cron.

Además, `post_reaction` / `post_comment` (script 43, ver sección Reacciones y comentarios).

**Ya corrido en el proyecto real:** [scripts/40-notification-triggers.sql](scripts/40-notification-triggers.sql). **PERO `pg_cron` sigue sin habilitarse** en el proyecto (verificado 27/7/2026), así que `notify_pending_reports()` existe pero nadie la llama: los avisos `report_available` no se disparan hasta habilitar la extensión (Database → Extensions) y re-correr el bloque `DO` final del script 40, o llamarla desde otro scheduler.

### `notifications` va SIEMPRE por el service role

La RLS de `notifications` (script 19) filtra por `current_setting('request.jwt.claims')->>'username'`, un claim que el anon key **nunca** lleva. Resultado: leer o actualizar la tabla con el cliente normal devolvía vacío / no hacía nada, en silencio — la página de notificaciones estaba muerta y el badge siempre en 0. Por eso `getUserNotifications`, `getUnreadNotificationsCount`, `markNotificationAsRead` y `markAllNotificationsAsRead` pasan por el helper `notificationsClient()` de [lib/actions.ts](lib/actions.ts), que devuelve `getSupabaseAdmin()` (service role) y cae al anon si falta `SUPABASE_SERVICE_ROLE_KEY`. Cada query igual filtra por `user_username` a mano. Si se agregan más lecturas de `notifications`, usar ese helper y no `supabase` directo.

`getUserNotifications` además resuelve el nombre del grupo (`group_name`) con una query extra, porque la tabla solo guarda `group_id` y los textos de los triggers no lo incluyen. La página de notificaciones lo muestra debajo de cada mensaje y manda las de tipo `activity_tag` a `/activity-tags` (donde se aceptan/rechazan), no al grupo.

## Etiquetas de actividad (Actividades Compartidas)

Flujo: `logActivity` crea filas en `activity_tags` (RPC `create_activity_tags`) → trigger crea la notificación → el etiquetado responde en [/activity-tags](app/activity-tags/page.tsx) ([components/activity-tags-panel.tsx](components/activity-tags-panel.tsx)).

- **`getPendingActivityTags` devuelve datos reales.** Antes fabricaba el objeto (`points: 0`, `group.name: ""`, el que etiquetó salía de partir el título de la notificación) y por eso la pantalla mostraba "te ha etiquetado en una actividad" sin nombre, "Grupo desconocido" y "0 pts". Ahora: notificaciones no leídas → RPC `get_activity_tags_by_ids` (SECURITY DEFINER, script 23, necesario porque `activity_tags` también tiene RLS por claim de JWT) → filtra `status = 'pending'` → enriquece con `user_activities` + `group_activities`, `groups` y el avatar de quien etiquetó.
- **Los puntos NO se copian de quien etiquetó.** `acceptActivityTag` recalcula el puntaje base desde `group_activities` (helper `computeBaseActivityPoints`, mismo criterio que `logActivity`: fijo o `minutos * points_per_minute`) y le aplica `applyGoalMultiplier` con el objetivo de **quien acepta**. Antes insertaba `originalActivity.points_earned` tal cual, así que una actividad 100% aeróbica de 45 pts le daba 45 a alguien con objetivo `gain` en vez de 38. El panel muestra ese mismo número como "X pts para vos" antes de aceptar.

## Íconos de deporte en las actividades

Cada actividad lleva un ícono de deporte, y **es obligatorio**.

⚠️ **Ya NO es informativo.** Antes lo era; desde el ranking global, el deporte elegido es lo que define (a) cuánto suma la actividad en la tabla general y (b) en qué otros grupos se replica el registro. Lo que **sigue sin tocar** son los puntos del grupo: esos los define el admin en `group_activities.points` / `points_per_minute` y los calcula `logActivity` igual que siempre.

- **Catálogo:** [lib/sport-icons.ts](lib/sport-icons.ts) — módulo PURO (como `lib/points.ts`), importable desde cliente y desde `actions.ts`. ~50 deportes agrupados en 8 categorías, cada uno con `id` estable (lo que se guarda en la DB), label en español, emoji y keywords para la búsqueda.
  - **Son emoji, no una librería de íconos SVG, a propósito:** `lucide-react` (la única librería de íconos del proyecto) no tiene fútbol, tenis, pádel, boxeo ni surf — solo `dumbbell`, `bike`, `volleyball` y poco más. Los emoji cubren todos los deportes, pesan 0 en el bundle y se ven bien en los tamaños chicos del calendario (mismo criterio que los avatares).
  - Donde Unicode no tiene emoji propio (squash) se reusa el más parecido; el label distingue.
- **Selector:** [components/sport-icon-picker.tsx](components/sport-icon-picker.tsx) — grilla por categoría + buscador (sin acentos ni mayúsculas). Prop `compact` para los formularios embebidos y `allowNone` para permitir "Sin ícono".

Dos usos distintos:

1. **Deporte fijo de la actividad del grupo** (`group_activities.icon`): **obligatorio** al crear ([app/groups/[id]/activities/create/page.tsx](app/groups/[id]/activities/create/page.tsx)) o editar ([components/activity-manager.tsx](components/activity-manager.tsx)) una actividad, salvo en las genéricas. De él se deriva `relation_id` server-side vía `resolveRelationId()` — el selector de "Actividad Relacionada" que había en el form de creación **se eliminó**, porque tener dos campos para lo mismo era justo lo que se desincronizaba.
2. **Deporte por registro** (`user_activities.sport_icon`): ahora se guarda en **todos** los registros, no solo en los genéricos. Al elegir una actividad que ya tiene deporte fijo viene precargado (un tap menos); en las **genéricas** — nombre que matchea `isOtherActivityName()` — alguna palabra del nombre es `otro`/`otra`/`otros`/`otras`, sin distinguir mayúsculas ni acentos (matchea "Otros", "OTROS DEPORTES", "Otra actividad"; NO matchea "Pullover", porque compara palabras enteras). En esas, el selector aparece **al registrar** ([components/activity-selector.tsx](components/activity-selector.tsx), dentro de la card seleccionada) y elegir es **obligatorio**: lo valida el submit de [app/log/page.tsx](app/log/page.tsx) (botón deshabilitado + mensaje) y de nuevo `logActivity` en el server. Esas actividades no tienen ícono fijo — el formulario de creación/edición reemplaza el selector por un cartel explicándolo.

### El bug que borraba las relaciones (arreglado)

`updateGroupActivity` escribía `relation_id: relation_id ? parseInt : null`, y el formulario de edición (`activity-manager.tsx`) **nunca mandaba ese campo**. Resultado: cada vez que un admin editaba una actividad, la relación se borraba en silencio y esa actividad dejaba de sumar en el ranking global. Le pasó a "Gimnasio" de Road To Rio 2027 — la actividad con más uso de toda la app (59 registros solo en agosto).

Ahora lo resuelve `resolveRelationId()` en [lib/actions.ts](lib/actions.ts), con este orden: **`relation_id` explícito del form → derivada del deporte elegido → la que ya tenía**. El último escalón es el que evita que se pierda nunca más.

Resolución al mostrar: `resolveActivityEmoji(sport_icon, group_activities.icon)` — manda el elegido al registrar, y si no hay, el fijo de la actividad; si no hay ninguno, la UI cae al ícono genérico de siempre (mancuerna/reloj). Se ve en el feed de Inicio ([feed-post.tsx](components/feed/feed-post.tsx), el `FeedItem` de tipo `activity` trae el emoji ya resuelto en `sportEmoji`), el detalle del día del calendario ([group-calendar.tsx](components/group-calendar.tsx)), el historial del grupo, el historial propio y las actividades recientes del perfil.

Al aceptar una etiqueta, `acceptActivityTag` copia el `sport_icon` del registro original (es la misma salida). `logRelatedActivity` lo replica en todos los grupos relacionados.

**Ya corrido en el proyecto real:** [scripts/44-add-sport-icons.sql](scripts/44-add-sport-icons.sql) (agrega `group_activities.icon` y `user_activities.sport_icon`, ambas nullable). Los registros históricos quedan sin ícono y se ven igual que antes. No hacen falta policies nuevas: las policies existentes son por fila, no por columna.

## Cadencia del reporte de peso: 14 días

El reporte es cada **14 días** (dos semanas exactas) y no cada 15, así siempre cae el mismo día de la semana que el anterior. La constante única es `REPORT_INTERVAL_DAYS` en [lib/date-utils.ts](lib/date-utils.ts), que usa `getUserReportStatus` en [lib/actions.ts](lib/actions.ts) (`needs_report` / `days_until_next`, lo que ven la página de Seguimiento, el recordatorio al entrar y el toggle de notificaciones). No hay validación en `createReport`: el intervalo solo controla cuándo se avisa/marca como pendiente, no bloquea reportar antes.

Del lado de la DB el mismo número vive en `notify_pending_reports()` (la del cron) y en las funciones sueltas `user_needs_report()` / `days_until_next_report()` del script 04 (que la app no llama, pero se dejaron en sync). Si se vuelve a cambiar la cadencia hay que tocar los dos lados.

**Ya corrido en el proyecto real (20/8/2026):** [scripts/45-report-interval-14-days.sql](scripts/45-report-interval-14-days.sql) (redefine esas tres funciones con 14 días).

## Calendario del grupo

Tercera pestaña de [app/groups/[id]/page.tsx](app/groups/[id]/page.tsx) (`General / Calendario / Rodeos`), en [components/group-calendar.tsx](components/group-calendar.tsx). Es **solo lectura**: no registra, no edita ni borra nada.

- **Vista Mes:** grilla de 6×7 arrancando lunes. Cada celda se tiñe con `bg-toro-accent` según qué proporción del grupo se movió ese día (4 niveles + leyenda) y muestra hasta 3 emojis de avatar + "+N". Hoy lleva borde `toro-primary`.
- **Vista Semana:** matriz miembros × 7 días con los puntos de cada uno por día ("–" si no hizo nada), ordenada por puntos de la semana. Entra justo en 375px; si el contenedor es más angosto scrollea sola dentro de su `overflow-x-auto`.
- Tocar un día (en cualquiera de las dos vistas) abre el detalle debajo: cada persona con su total y los chips de sus actividades (nombre, minutos, puntos).
- **Datos:** `getGroupActivitiesInRange(groupId, fromISO, toISO)` en [lib/actions.ts](lib/actions.ts) — trae solo la ventana visible, no todo el historial. Los días se agrupan en **hora Argentina** con los helpers nuevos de [lib/date-utils.ts](lib/date-utils.ts) (`argDayKey`, `toDayKey`, `argDayStartISO`, `argDayEndISO`), no con la zona del navegador. `avatarEmoji()` se exporta desde [components/user-avatar.tsx](components/user-avatar.tsx) para dibujar avatares mini en las celdas (el componente `UserAvatar` no sirve en ese tamaño).

No requiere ninguna migración: usa `user_activities`, que ya tiene policy `Public access`.

## Web Push (notificaciones al teléfono con la app cerrada)

Web Push real con VAPID — reemplaza al viejo esquema "fake" (polling de `notification-listener.tsx` + `showNotification` local, que solo funcionaba con la app abierta y sigue existiendo para etiquetas de actividad).

- **Claves VAPID:** en `.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). ⚠️ **Hay que cargar las tres también en Vercel** (Settings → Environment Variables) o el push no funciona en producción. Se generan con `npx web-push generate-vapid-keys`; si se regeneran, todas las suscripciones existentes mueren.
- **Suscripción (cliente):** [lib/push-client.ts](lib/push-client.ts) → `ensurePushSubscription(username)`: registra `/sw.js`, hace `pushManager.subscribe` con la clave pública y guarda endpoint+claves en `push_subscriptions` vía `savePushSubscription` (upsert por endpoint: un usuario puede tener varios dispositivos; si otro usuario se loguea en el mismo dispositivo, se la transfiere). La llaman: [components/push-subscriber.tsx](components/push-subscriber.tsx) (montado en `app-provider.tsx`, re-sincroniza en cada apertura si el permiso ya está concedido), [components/notification-prompt.tsx](components/notification-prompt.tsx) (cartel en el feed de Inicio que pide el permiso — antes existía pero no estaba montado en ningún lado) y el toggle de [components/notification-manager.tsx](components/notification-manager.tsx) (Ajustes).
- **Envío (server):** [lib/push-server.ts](lib/push-server.ts) → `sendPushToUser(username, {title, body, url, tag})` con el paquete `web-push`. Poda solas las suscripciones muertas (HTTP 404/410 del push service). Sin claves VAPID en el entorno es un no-op con warning (la notificación in-app igual se crea). Hoy lo usa solo `notifyPostInteraction`; para pushear otros tipos (ranking, reportes) habría que llamarlo desde los flujos correspondientes o mover el envío a un webhook de DB.
- **Service worker:** el handler `push` de [public/sw.js](public/sw.js) entiende el formato genérico `{title, body, url, tag}` (el click abre `url`); mantiene los formatos legacy de etiquetas/motivación diaria.
- **iOS:** el push solo llega si la PWA está instalada en la pantalla de inicio (iOS 16.4+); en Safari suelto no existe `PushManager`. En Android/desktop anda directo en el navegador.
- Probado contra la DB real (27/7/2026): reacción/comentario → fila en `notifications` + intento de push; el cifrado/VAPID de `web-push` verificado localmente; entrega real a un dispositivo requiere probar con la app instalada.

## Ranking global entre grupos

Tabla única que compara a todo el mundo, sin importar de qué grupo venga. **No toca nada del flujo actual:** `logActivity`, los puntos que define cada admin en `group_activities.points` / `points_per_minute`, el ranking de cada grupo y los rodeos siguen exactamente igual.

El problema que resuelve: los puntos de grupo no son comparables entre grupos (la misma actividad vale 50 en uno y 100 en otro), así que hace falta una **segunda escala, paralela**.

- **`activity_relations.global_points`**: cuánto suma UNA sesión de ese deporte en el ranking global, igual para todos. **Gimnasio = 100 es el techo** y nada lo supera; el resto baja según cuánto exige una sesión típica (Crossfit/Natación/Boxeo/Rugby/Funcional/Remo 90, Running/Ciclismo/Escalada 85, Fútbol 11/Básquet/Trekking 80, Tenis/Vóley/Surf 70, Padel/Pilates/Baile 60, Yoga/Caminata 50, Golf/Bowling 40, Pesca/Automovilismo 30).
- **El catálogo pasó de 16 a 55 relaciones**, alineadas con `SPORT_ICONS` de [lib/sport-icons.ts](lib/sport-icons.ts) vía la columna nueva `activity_relations.sport_key`. Ese puente es lo que hace que el deporte elegido al registrar una actividad **genérica** ("Otros", que guarda `user_activities.sport_icon`) también puntúe en el global.
- **Resolución del puntaje de cada registro**, en orden: `user_activities.sport_icon` → `activity_relations.sport_key`; si no, `group_activities.relation_id`; si no hay ninguno, **0** (no suma). Los reportes de peso insertan filas con `activity_id` NULL: quedan afuera, el global es solo actividad física.
- **UN solo deporte por persona y por día** (script 48). Si hacés gimnasio dos veces el mismo día, en la general suma una sola vez. Esto además resuelve el doble conteo de la réplica entre grupos: `logActivity` inserta una fila por cada grupo del usuario que tenga ese deporte, y el ranking de grupo las cuenta todas (bien), pero el global cuenta una (bien también). Si el mismo día hay dos filas del mismo deporte con puntajes distintos, se toma el **mayor**.
- La deduplicación vive en la vista `global_activity_days` + el `GROUP BY username, day, relation_id` de los RPC. Por eso la columna `activities` que devuelve `get_global_ranking` son **días-deporte contados**, no filas de `user_activities`.
- Por eso **es importante que cada actividad de grupo tenga su relación**. El backfill del script 46 la resolvió por nombre y alias ("Gym"→Gimnasio, "Bici"→Ciclismo, "Correr"→Running…), y el 48 completó además el emoji de cada una desde `sport_key`. Hoy las únicas sin deporte son `Otros` (a propósito: lo elige quien registra) y `test`.
- **Réplica entre grupos:** al registrar, el deporte elegido resuelve la relación y `logRelatedActivity` inserta en todos los grupos del usuario que tengan una actividad de ese deporte. La actividad de origen **siempre** entra en esa lista, aunque no matchee la relación buscada — pasa al registrar una genérica ("Otros", sin relación propia) eligiendo un deporte que el grupo actual no tiene configurado; sin esa salvaguarda el registro se guardaba en los otros grupos y no en el que la persona eligió.

Cálculo en los RPC del script 46 (`get_global_ranking`, `get_global_sport_breakdown`, `get_user_active_days`) para no traerse todo `user_activities` al server en cada request. Server actions: `getGlobalRanking`, `getGlobalSportBreakdown`, `getActivityRelations` en [lib/actions.ts](lib/actions.ts).

**Rangos** (Ternero / Novillo / Toro / Toro de Oro): función PURA de los puntos del período que se está mirando ([lib/global-points.ts](lib/global-points.ts)), **sin ascenso/descenso persistido** en la DB. En "Semana" todos arrancan de cero.

UI en `/ranking` ([components/ranking/](components/ranking/)): podio del top 3, tarjeta propia con progreso al próximo rango, tabla y drawer con el desglose por deporte. Se entra por el trofeo del header de Inicio y por la tira de racha — **la barra de abajo quedó igual a propósito**.

**Ya corrido en el proyecto real:** [scripts/46-global-ranking.sql](scripts/46-global-ranking.sql) y [scripts/48-global-one-per-day.sql](scripts/48-global-one-per-day.sql) (este último trae también los arreglos de datos: restaurar la relación de "Gimnasio", completar los emoji faltantes y unificar "Fútbol 5" contra "Fútbol 11", porque el catálogo de deportes tiene un solo "Fútbol").

## Rachas

Días consecutivos con al menos una actividad, agrupados en **hora Argentina** (el RPC `get_user_active_days` ya devuelve las fechas convertidas). La lógica es un módulo PURO: [lib/streaks.ts](lib/streaks.ts) → `computeStreak(activeDays, todayKey)`.

- La racha es **estricta**: no hay "perdón" automático. Lo que sí hay es el estado `atRisk` — sigue viva pero hoy todavía no registraste nada, que es el momento en que la UI empuja.
- Si hoy no registraste pero ayer sí, la racha **se cuenta desde ayer** y sigue viva hasta que termine el día.
- Devuelve además `weekDays` (un booleano por día, lunes a domingo) para dibujar la semana.

Se ve en la tira de arriba del feed ([components/feed/streak-strip.tsx](components/feed/streak-strip.tsx)), que muestra racha + semana + posición global y es el acceso a `/ranking`. También en la tarjeta propia del ranking y en el drawer de cada persona. `getGroupStreaks(groupId)` está disponible para un panel por grupo (hoy no montado).

## Juegos de descanso (entre serie y serie)

El descanso de [components/routine/rest-timer.tsx](components/routine/rest-timer.tsx) reemplaza a la pastillita muda de antes. **Tres cosas que se notan más que cualquier juego:**

1. **La pantalla no se apaga** (Wake Lock API, se re-pide en `visibilitychange`). Antes se bloqueaba a los 30s con las manos ocupadas.
2. **Avisa**: `navigator.vibrate` + un beep sintetizado con Web Audio — sin archivos de audio, 0 KB de bundle.
3. **Cuenta contra un timestamp absoluto**, no restando de a un segundo, así no se atrasa cuando el navegador frena los timers en segundo plano.

Encima de eso va **el juego del día**: uno solo por día e **igual para todo el grupo** (estilo Wordle), elegido determinísticamente con un hash de la fecha en `gameOfTheDay()` de [lib/rest-games.ts](lib/rest-games.ts) — nada de `Math.random`, si no cada uno vería otro. Dura exactamente lo que dura el descanso y termina empujándote a la próxima serie.

Cuatro juegos en [components/routine/rest-games/](components/routine/rest-games/), todos con el mismo contrato (`RestGameProps`: reciben `addScore`, no manejan su propio tiempo): **Reacción** (500 − ms), **Memoria** (Simón, 40 × ronda), **Trivia fierrera** (100 por acierto, preguntas del día iguales para todos vía `triviaForDay`) y **Precisión** (hasta 240 por tiro, la zona se achica).

- **Pantalla propia en `/descanso`** ([components/routine/daily-game.tsx](components/routine/daily-game.tsx)), con acceso desde el ícono 🎮 del header de Inicio (al lado del trofeo) y del header de Mi Rutina. Existe porque el juego solo aparecía al marcar una serie: hasta que eso pasaba, la feature era **invisible**. Ahí la ronda dura siempre `DAILY_ROUND_SECONDS` (60s) — fija a propósito, porque en los descansos dura lo que dure el descanso y así los puntajes no se podrían comparar entre sí.
- Se pueden **apagar** (`REST_GAMES_ENABLED_KEY` en localStorage) y el timer vuelve al modo compacto.
- El puntaje va a `rest_game_scores`, tabla aparte: **no toca puntos de actividad ni el ranking global**. La tabla semanal (`get_rest_game_leaderboard`) suma el **mejor puntaje de cada día**, no todas las partidas, así gana quien juega bien varios días y no quien repite veinte veces seguidas.
- **Descanso configurable por ejercicio**: `RoutineExercise.rest_seconds` (la columna `routines.exercises` es `jsonb`, así que **no hizo falta migración**; las rutinas viejas lo traen ausente y caen en `DEFAULT_REST_SECONDS` = 90). Se elige en el armador de rutinas y se puede ajustar en el momento con los +/- del timer.
- El timer **se remonta con `key` en cada serie** (`rest.id`) en vez de reiniciarse con un efecto que dependa de la duración: si no, tocar +/- reiniciaría la cuenta.

**Ya corrido en el proyecto real:** [scripts/47-rest-games.sql](scripts/47-rest-games.sql) (crea `rest_game_scores` **con policy `Public access`** — sin eso el insert falla en silencio, como toda tabla nueva de este proyecto).

## Convenciones existentes (no introducidas por este cambio)

- Colores de marca: `toro-background #FDF7E4`, `toro-foreground #3A3A3A`, `toro-primary #FF6B6B`, `toro-secondary #FFD166`, `toro-accent #06D6A0` (ver `tailwind.config.ts`).
- Contenedor mobile-first `max-w-md mx-auto` para todas las pantallas de la app (no aplica a la landing, que es full-width).
- Zona horaria Argentina (UTC-3) para todo cálculo de semanas/fechas (`lib/date-utils.ts`).
- `next.config.mjs` tiene `ignoreBuildErrors`/`ignoreDuringBuilds` en true — heredado de v0, no oculta nada que hayamos roto nosotros pero tampoco hay que confiarse: correr `tsc`/`eslint` a mano si se toca algo delicado.
