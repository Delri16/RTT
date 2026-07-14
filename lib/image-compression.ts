// Fast, mobile-safe image compression.
//
// The previous version used FileReader.readAsDataURL + new Image(), which builds
// a multi-MB base64 string in memory and decodes on the main thread — that's what
// froze iOS Safari on big camera photos. This version uses createImageBitmap(),
// which decodes off the main thread directly from the File blob (no base64), and
// downscales through a canvas. Falls back to the old path only if createImageBitmap
// is unavailable.

const MAX_DIMENSION = 1080 // longest side after downscale (good enough for phone photos)
const TARGET_MAX_BYTES = 500_000 // ~0.5MB target; step quality down until we hit it

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality))
}

function computeSize(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h }
  if (w >= h) return { width: max, height: Math.round((h / w) * max) }
  return { width: Math.round((w / h) * max), height: max }
}

async function decodeBitmap(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    // orientation handling: browsers that support imageOrientation will auto-rotate
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions).catch(
      () => createImageBitmap(file),
    )
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      close: () => bitmap.close(),
    }
  }

  // Fallback: object URL + <img> (still avoids the giant base64 data URL)
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("No se pudo cargar la imagen"))
      el.src = url
    })
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      close: () => URL.revokeObjectURL(url),
    }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

export async function compressImage(file: File): Promise<File> {
  // Small files: skip work entirely.
  if (file.size < 200_000 || !file.type.startsWith("image/")) return file

  const source = await decodeBitmap(file)

  try {
    const { width, height } = computeSize(source.width, source.height, MAX_DIMENSION)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) throw new Error("No se pudo procesar la imagen")
    ctx.imageSmoothingQuality = "medium"
    source.draw(ctx, width, height)

    // Step quality down until under target (or floor at 0.4).
    let quality = 0.8
    let blob = await canvasToBlob(canvas, quality)
    while (blob && blob.size > TARGET_MAX_BYTES && quality > 0.4) {
      quality -= 0.15
      blob = await canvasToBlob(canvas, quality)
    }

    if (!blob) throw new Error("No se pudo comprimir la imagen")

    // If compression somehow produced a bigger file than the original, keep original.
    if (blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() })
  } finally {
    source.close()
  }
}
