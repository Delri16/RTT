# ToroApp - Documentacion Completa del Proyecto

## Resumen General

ToroApp es una aplicacion movil-first (PWA) para tracking de actividades fisicas en grupos. Los usuarios pueden unirse a grupos, registrar actividades, competir en rankings semanales, participar en "rodeos" (competencias 1v1 semanales), y ganar logros.

**Stack Tecnologico:**
- Frontend: Next.js 14.2.35 (App Router), React 19, TypeScript
- Estilos: Tailwind CSS con shadcn/ui
- Base de datos: Supabase (PostgreSQL)
- Autenticacion: username + email, verificado con codigo OTP de Supabase Auth (ver seccion "Autenticacion" mas abajo). El username sigue siendo la clave usada en el resto del dominio (grupos, actividades, rankings, etc.)
- PWA: Service Worker para funcionalidad offline

---

## Estructura de Carpetas

```
/app                    # Paginas (App Router)
  /achievements         # Sistema de logros
  /activities           # Historial de actividades del usuario
  /activity-tags        # Etiquetas de actividades pendientes
  /create-group         # Crear nuevo grupo
  /dashboard            # Dashboard principal
  /discover             # Descubrir grupos publicos
  /groups               # Lista de grupos del usuario
    /[id]               # Detalle de grupo
      /activities       # Actividades del grupo
      /manage           # Administrar grupo (solo admins)
      /rodeos           # Sistema de rodeos/duelos
  /log                  # Registrar actividad rapida
  /logout               # Cerrar sesion
  /profile              # Perfil del usuario
    /[username]         # Perfil publico de otro usuario
  /reports              # Reportes de peso
  /settings             # Configuraciones

/components             # Componentes reutilizables
/lib                    # Utilidades y funciones
  actions.ts            # Server Actions (CRUD principal)
  supabase.ts           # Cliente de Supabase
  date-utils.ts         # Utilidades de fechas
  achievements.ts       # Logica de logros
  image-compression.ts  # Compresion de imagenes
  push-notifications.ts # Notificaciones push

/scripts                # Scripts SQL para migraciones
/public                 # Assets estaticos
```

---

## Base de Datos - Esquema Completo

### Tablas Principales

#### `profiles`
Usuarios del sistema.
```sql
username: text (PK)
email: text (unico, case-insensitive; nullable para cuentas legacy sin migrar)
auth_user_id: uuid (FK auth.users.id; nullable hasta que el usuario verifica su email)
avatar: text
avatar_url: text
current_weight: numeric
target_weight: numeric
updated_at: timestamp
```

#### `groups`
Grupos de entrenamiento.
```sql
id: uuid (PK)
name: text
description: text
created_by: text (FK profiles.username)
created_at: timestamp
end_date: date
is_public: boolean
invite_code: text (codigo unico para unirse)
```

#### `group_members`
Miembros de cada grupo.
```sql
group_id: uuid (FK groups.id)
username: text (FK profiles.username)
is_admin: boolean
joined_at: timestamp
```

#### `group_activities`
Actividades configuradas por grupo (definiciones).
```sql
id: uuid (PK)
group_id: uuid (FK groups.id)
name: text
activity_type: varchar ('fixed' | 'per_minute')
points: integer (para tipo fixed)
points_per_minute: numeric (para tipo per_minute)
min_minutes: integer
max_minutes: integer
relation_id: integer (FK activity_relations.id)
```

#### `activity_relations`
Categorias/relaciones de actividades.
```sql
id: integer (PK)
name: varchar
description: text
icon: varchar
```

#### `user_activities`
Actividades registradas por usuarios.
```sql
id: uuid (PK)
username: text (FK profiles.username)
group_id: uuid (FK groups.id)
activity_id: uuid (FK group_activities.id)
points_earned: integer
minutes_performed: integer
completed_at: timestamp
```

### Sistema de Rodeos (Competencias 1v1)

#### `groups_rodeo_fixtures`
Duelos semanales actuales.
```sql
id: uuid (PK)
group_id: uuid
week_number: integer
week_start: date
week_end: date
player_a_username: text
player_b_username: text
score_a: integer
score_b: integer
winner_username: text
status: text ('pending' | 'completed')
is_bye: boolean
closed_at: timestamp
```

#### `groups_rodeo_history`
Historial de duelos completados con puntos finales.
```sql
id: uuid (PK)
group_id: uuid
week_number: integer
week_start: timestamp
week_end: timestamp
player_a_username: text
player_b_username: text
player_a_points: integer
player_b_points: integer
winner_username: text
is_bye: boolean
closed_at: timestamp
```

#### `groups_rodeo_matchup_history`
Historial de enfrentamientos para evitar repeticiones.
```sql
id: uuid (PK)
group_id: uuid
player_a_username: text
player_b_username: text
times_played: integer
```

#### `groups_rodeo_standings`
Tabla de posiciones del rodeo.
```sql
id: uuid (PK)
group_id: uuid
player_username: text
wins: integer
losses: integer
draws: integer
proteins: integer (puntos de clasificacion)
creatines: integer
total_score: integer
current_streak: integer
best_streak: integer
bye_count: integer
```

### Sistema de Reportes de Peso

#### `bi_weekly_reports`
Reportes bisemanales de peso con fotos.
```sql
id: uuid (PK)
username: text
group_id: uuid
report_date: date
reported_weight: numeric
scale_photo_url: text
body_photo_url: text
created_at: timestamp
```

### Sistema de Etiquetas (Tags)

#### `activity_tags`
Etiquetas de actividades para otros usuarios.
```sql
id: uuid (PK)
activity_id: uuid (FK user_activities.id)
group_id: uuid
tagged_by: text (quien etiqueta)
tagged_user: text (usuario etiquetado)
status: text ('pending' | 'accepted' | 'rejected')
rejection_reason: text
created_at: timestamp
responded_at: timestamp
```

### Sistema de Solicitudes

#### `activity_requests`
Solicitudes de edicion/eliminacion de actividades.
```sql
id: uuid (PK)
group_id: uuid
activity_id: uuid
requester_username: text
request_type: text ('delete' | 'edit_date')
reason: text
new_date: timestamp (para edicion)
status: text ('pending' | 'approved' | 'rejected')
reviewed_by: text
reviewed_at: timestamp
admin_notes: text
```

### Sistema de Logros

#### `user_achievements`
Logros desbloqueados por usuarios.
```sql
id: uuid (PK)
username: text
group_id: uuid
activity_id: uuid
achievement_key: text
achievement_name: text
achievement_description: text
achievement_type: text
completed_at: timestamp
```

### Notificaciones

#### `notifications`
Sistema de notificaciones in-app.
```sql
id: uuid (PK)
user_username: text
group_id: uuid
notification_type: text
title: text
message: text
is_read: boolean
read_at: timestamp
activity_request_id: uuid
activity_tag_id: uuid
created_at: timestamp
```

#### `push_tokens`
Tokens para notificaciones push.
```sql
id: uuid (PK)
username: text
token: text
endpoint: text
last_used_at: timestamp
```

---

## Funciones Principales (lib/actions.ts)

### Autenticacion y Perfil
- `createOrGetProfile(username)` - Crear o obtener perfil
- `loginWithPassword(username, password)` - Login
- `updateProfile(username, updates)` - Actualizar perfil
- `getUserProfile(username)` - Obtener perfil

### Grupos
- `createGroup(formData)` - Crear grupo
- `updateGroup(groupId, formData)` - Actualizar grupo
- `deleteGroup(groupId)` - Eliminar grupo
- `joinGroup(groupId, username)` - Unirse a grupo
- `joinGroupByInviteCode(inviteCode, username)` - Unirse por codigo
- `leaveGroup(groupId, username)` - Salir de grupo
- `getPublicGroups(username)` - Obtener grupos publicos
- `getUserGroups(username)` - Obtener grupos del usuario
- `getGroupDetails(groupId)` - Detalles de grupo
- `removeGroupMember(groupId, username)` - Expulsar miembro
- `promoteToAdmin(groupId, username)` - Promover a admin

### Actividades
- `createGroupActivity(formData)` - Crear actividad en grupo
- `updateGroupActivity(activityId, formData)` - Actualizar actividad
- `deleteGroupActivity(activityId)` - Eliminar actividad
- `logActivity(formData)` - Registrar actividad realizada
- `getAllGroupActivities(groupId)` - Todas las actividades del grupo
- `getUserActivities(username, limit)` - Actividades del usuario
- `getRecentActivities(username)` - Actividades recientes

### Rankings
- `getGroupRanking(groupId, period)` - Ranking por periodo
- `getGroupRankingByWeek(groupId, weekNumber)` - Ranking de semana especifica
- `getGroupRankingTotal(groupId)` - Ranking total historico
- `getGroupMembersWithTotalPoints(groupId)` - Miembros con puntos totales
- `getWeeksWithData(groupId)` - Semanas con datos

### Rodeos
- `initializeRodeo(groupId)` - Inicializar sistema de rodeo
- `generateWeeklyFixtures(groupId)` - Generar duelos semanales
- `regenerateWeeklyFixtures(groupId)` - Regenerar duelos
- `closeWeeklyFixtures(groupId)` - Cerrar semana y calcular ganadores
- `getRodeoStandings(groupId)` - Tabla de posiciones
- `getCurrentWeekFixtures(groupId)` - Duelos de semana actual
- `getRodeoHistory(groupId)` - Historial de duelos
- `getRodeoStats(groupId)` - Estadisticas del rodeo
- `syncRodeoHistory(groupId)` - Sincronizar historial

### Reportes de Peso
- `createBiWeeklyReport(formData)` - Crear reporte
- `getUserReportStatus(username)` - Estado de reportes
- `getGroupReports(groupId)` - Reportes del grupo
- `getUserReports(username, groupId)` - Reportes del usuario
- `getUserWeightReports(username)` - Historial de peso

### Etiquetas (Tags)
- `getPendingActivityTags(username)` - Tags pendientes
- `acceptActivityTag(tagId, username)` - Aceptar tag
- `rejectActivityTag(tagId, username, reason)` - Rechazar tag
- `getActivityTagsForActivity(activityId)` - Tags de una actividad

### Solicitudes
- `createActivityRequest(...)` - Crear solicitud
- `getPendingRequests(username, groupId)` - Solicitudes pendientes
- `approveActivityRequest(username, requestId, adminNotes)` - Aprobar
- `rejectActivityRequest(username, requestId, adminNotes)` - Rechazar
- `deleteActivityDirectly(...)` - Eliminar actividad (admin)
- `editActivityDateDirectly(...)` - Editar fecha (admin)

### Notificaciones
- `getUserNotifications(username)` - Notificaciones del usuario
- `getUnreadNotificationsCount(username)` - Contador de no leidas
- `markNotificationAsRead(notificationId, username)` - Marcar como leida
- `markAllNotificationsAsRead(username)` - Marcar todas como leidas
- `sendBroadcastNotification(adminUsername, message, title)` - Enviar a todos

---

## Componentes Principales

### Navegacion
- `bottom-nav.tsx` - Navegacion inferior (Home, Grupos, Log, Perfil)
- `login-screen.tsx` - Pantalla de login

### Grupos
- `ranking-selector.tsx` - Selector de ranking (semanal/total) con tabla
- `group-activity-history.tsx` - Historial de actividades con estadisticas
- `rodeos-tab.tsx` - Tab de rodeos con duelos y standings

### Actividades
- `activity-selector.tsx` - Selector de actividades para registrar
- `activity-manager.tsx` - Gestor de actividades (CRUD)
- `member-tag-selector.tsx` - Selector de miembros para etiquetar

### Notificaciones
- `activity-tags-badge.tsx` - Badge de tags pendientes
- `activity-tags-panel.tsx` - Panel de tags pendientes
- `activity-requests-badge.tsx` - Badge de solicitudes
- `activity-requests-panel.tsx` - Panel de solicitudes
- `notification-manager.tsx` - Gestor de notificaciones
- `notification-listener.tsx` - Listener de notificaciones en tiempo real

### Perfil
- `user-avatar.tsx` - Avatar de usuario
- `avatar-selector.tsx` - Selector de avatar

### UI
- `achievement-toast.tsx` - Toast de logros desbloqueados
- `motivational-quote.tsx` - Frases motivacionales
- `upload-progress-indicator.tsx` - Indicador de subida
- `debug-panel.tsx` - Panel de debug (desarrollo)

---

## Flujos Importantes

### 1. Registro de Actividad
1. Usuario va a `/log` o `/groups/[id]/activities/create`
2. Selecciona grupo y actividad
3. Ingresa cantidad/minutos
4. Opcionalmente etiqueta a otros miembros
5. Se crea registro en `user_activities`
6. Si hay tags, se crean en `activity_tags` con status 'pending'
7. Se verifican logros en `checkAndAwardAchievements()`

### 2. Sistema de Rodeos
1. Admin inicializa rodeo con `initializeRodeo()`
2. Cada semana se generan duelos con `generateWeeklyFixtures()`
3. Algoritmo evita repetir enfrentamientos recientes
4. Al cerrar semana (`closeWeeklyFixtures()`):
   - Se calculan puntos de cada jugador
   - Se determina ganador
   - Se actualizan standings (wins, losses, proteins)
   - Se guarda en historial

### 3. Sistema de Tags
1. Usuario A registra actividad y etiqueta a Usuario B
2. Se crea tag con status 'pending'
3. Usuario B ve notificacion en `activity-tags-badge`
4. Usuario B acepta o rechaza
5. Si acepta, se crea copia de la actividad para Usuario B

### 4. Calculos de Semana
La semana va de **Lunes a Domingo** usando zona horaria Argentina (UTC-3).
```typescript
// lib/date-utils.ts
getArgentinaWeekRange(date) // Retorna {start, end} de la semana
getArgentinaWeekNumber(date) // Numero de semana del ano
```

---

## Variables de Entorno Requeridas

```
SUPABASE_URL
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DATABASE
POSTGRES_HOST
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
```

---

## Consideraciones Tecnicas

### Paginacion de Supabase
Supabase limita queries a 1000 registros por defecto. Las funciones que necesitan todos los registros usan paginacion:
```typescript
while (hasMore) {
  const { data } = await supabase
    .from("tabla")
    .select("*")
    .range(offset, offset + pageSize - 1)
  // ...
}
```

### Compresion de Imagenes
Las fotos se comprimen antes de subir (max 480px, calidad 0.4, max 800KB).

### Zona Horaria
Todo el sistema usa zona horaria Argentina (UTC-3) para calculos de semanas y fechas.

### Autenticacion
Registro/login por **username + email**, verificado con un codigo OTP de 6 digitos que envia Supabase Auth (usando el SMTP configurado en el proyecto). El username sigue siendo la clave de negocio en todas las tablas (grupos, actividades, rankings, etc.) — Supabase Auth solo se usa para probar que el usuario controla ese email y para persistir la sesion.

Flujo (`components/login-screen.tsx`):
1. El usuario ingresa username + email. Si el username ya existe con un email distinto, se corta ahi (`lib/actions.ts` → `findProfileByUsername`).
2. `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` dispara el mail con el codigo.
3. El usuario ingresa el codigo. `supabase.auth.verifyOtp({ email, token, type: "email" })` crea/recupera el `auth.users` correspondiente y abre una sesion.
4. `lib/actions.ts` → `linkProfileToAuthUser(username, email, authUserId)` crea el `profiles` row (usuarios nuevos) o completa `email`/`auth_user_id` en un `profiles` row legacy que solo tenia username.

Persistencia: la sesion de Supabase (`persistSession` + `autoRefreshToken`, default del cliente) queda en `localStorage` y se renueva sola — el usuario no se desloguea solo. `app/app-provider.tsx` hidrata el `username` en el arranque leyendo la sesion activa (`getProfileByAuthUserId`) y escucha `onAuthStateChange`. Logout explicito = `supabase.auth.signOut()`.

Cuentas legacy (creadas antes de este cambio, sin `email`): al intentar loguearse de nuevo, como no tienen `auth_user_id`, pasan igual por el flujo de arriba y `linkProfileToAuthUser` completa su fila existente sin perder su historial de actividades/grupos.

Migracion de base necesaria: `scripts/33-add-email-auth.sql` (agrega `email` y `auth_user_id` a `profiles`). No se aplico automaticamente porque este entorno no tiene acceso al proyecto Supabase real de RTT — hay que correrlo a mano.

---

## Colores del Tema

```css
--toro-background: #FDF7E4 (fondo cremoso)
--toro-primary: #3A3A3A (texto principal)
--toro-secondary: #4A5D4A (verde oscuro)
--toro-accent: #D4A574 (dorado/naranja)
--toro-highlight: #FF6B35 (naranja brillante)
--toro-muted: #8B9B7A (verde apagado)
```

---

## PWA

La app es una Progressive Web App instalable con:
- Service Worker (`public/sw.js`)
- Manifest (`public/manifest.json`)
- Iconos en multiples tamanos
- Soporte offline basico
