import imageCompression from "browser-image-compression"

const OPTIONS: Parameters<typeof imageCompression>[1] = {
  maxSizeMB: 0.35,
  maxWidthOrHeight: 720,
  useWebWorker: true,
  fileType: "image/jpeg",
  initialQuality: 0.72,
}

/**
 * Compress an image for upload. Prefer capturing already-small frames via
 * getUserMedia; this is mainly for gallery picks. Falls back to the original
 * file if compression fails or produces a larger result.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file
  if (file.size < 180_000) return file

  try {
    const compressed = await imageCompression(file, OPTIONS)
    if (compressed.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return new File([compressed], name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    })
  } catch (err) {
    console.error("[compress] failed, using original:", err)
    return file
  }
}
