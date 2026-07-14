import { supabase } from "@/lib/supabase"

// Uploads a file straight from the browser to Supabase Storage and returns its
// public URL. This replaces routing the file through a server action (which
// serialized the whole photo as multipart to the server and then re-uploaded it
// to storage — double the bytes over the wire, and slow on mobile connections).
//
// The report_photos / avatars buckets are public with a permissive policy, so the
// anon client can upload directly.
const UPLOAD_TIMEOUT_MS = 90_000 // 90s: dan más margen en mobile con conexión inestable
const MAX_ATTEMPTS = 2

const TIMEOUT = Symbol("upload-timeout")

export async function uploadToStorage(
  file: File,
  bucket: string,
  path: string,
  opts?: { timeoutMs?: number; maxAttempts?: number },
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const timeoutMs = opts?.timeoutMs ?? UPLOAD_TIMEOUT_MS
  const maxAttempts = opts?.maxAttempts ?? MAX_ATTEMPTS

  let lastError = "No se pudo subir la imagen"

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // storage-js 2.12.1 no expone `signal` en upload(), así que no podemos cancelar
    // la request de raíz. Con Promise.race despegamos la UI igual: si tardó de más,
    // seguimos (reintentamos / avisamos). La request colgada queda huérfana pero
    // inofensiva — el path es único por envío y los reintentos pisan con upsert.
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<typeof TIMEOUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMEOUT), timeoutMs)
    })

    try {
      const result = await Promise.race([
        supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          // El primer intento no pisa nada; los reintentos sí, por si el anterior
          // quedó a medias y dejó un objeto parcial con el mismo path.
          upsert: attempt > 1,
          contentType: file.type || "image/jpeg",
        }),
        timeout,
      ])

      if (result === TIMEOUT) {
        lastError = "La subida tardó demasiado (conexión lenta). Probá de nuevo con mejor señal."
      } else if (result.error) {
        lastError = result.error.message
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(path)
        return { success: true, url: publicUrl }
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : lastError
    } finally {
      if (timer) clearTimeout(timer)
    }

    // Backoff corto antes de reintentar (no en el último intento).
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }

  return { success: false, error: lastError }
}

// Stable-ish unique path segment without leaking much. Uses time + random.
export function makePhotoPath(groupId: string, username: string, kind: string) {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${groupId}/${username}/${kind}_${Date.now()}_${rand}.jpg`
}
