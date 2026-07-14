import { supabase } from "@/lib/supabase"

// Uploads a file straight from the browser to Supabase Storage and returns its
// public URL. This replaces routing the file through a server action (which
// serialized the whole photo as multipart to the server and then re-uploaded it
// to storage — double the bytes over the wire, and slow on mobile connections).
//
// The report_photos / avatars buckets are public with a permissive policy, so the
// anon client can upload directly.
export async function uploadToStorage(
  file: File,
  bucket: string,
  path: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)

  return { success: true, url: publicUrl }
}

// Stable-ish unique path segment without leaking much. Uses time + random.
export function makePhotoPath(groupId: string, username: string, kind: string) {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${groupId}/${username}/${kind}_${Date.now()}_${rand}.jpg`
}
