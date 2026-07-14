// Fast, mobile-safe image compression.
//
// History:
//  - v0 usaba FileReader.readAsDataURL + new Image(): armaba un base64 de varios MB
//    en memoria y decodificaba en el main thread -> congelaba iOS Safari con fotos
//    grandes de cámara.
//  - v1 pasó a createImageBitmap() (decodifica fuera del main thread, sin base64)
//    pero decodificaba el bitmap a resolución COMPLETA y recién ahí escalaba en un
//    canvas. En celus con poca RAM, ese bitmap full-res (una foto de 12MP ~ 48MB en
//    memoria) todavía podía hacer que el SO matara la pestaña -> "la app crashea".
//  - v2 (esta): lee las dimensiones baratas con un <img> y le pide a createImageBitmap
//    que decodifique YA a tamaño reducido (resizeWidth/Height). El bitmap grande nunca
//    se materializa, así que el pico de memoria es una fracción. Además hay un timeout
//    para que un decode trabado nunca deje la UI colgada.

const MAX_DIMENSION = 1080 // longest side after downscale (good enough for phone photos)
const TARGET_MAX_BYTES = 500_000 // ~0.5MB target; step quality down until we hit it
const DECODE_TIMEOUT_MS = 20_000

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality))
}

function computeSize(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h }
  if (w >= h) return { width: max, height: Math.round((h / w) * max) }
  return { width: Math.round((w / h) * max), height: max }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

// Lee ancho/alto sin decodificar todo el bitmap a memoria JS (el browser mantiene
// su propia forma comprimida y la puede liberar). Ya viene con la orientación EXIF
// aplicada en los navegadores modernos.
function readDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve({ width: el.naturalWidth, height: el.naturalHeight })
    el.onerror = () => reject(new Error("No se pudo leer la imagen"))
    el.src = url
  })
}

// Decodifica el archivo directo a un canvas ya en el tamaño objetivo.
async function decodeToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  try {
    const { width: sw, height: sh } = await withTimeout(
      readDimensions(url),
      DECODE_TIMEOUT_MS,
      "La imagen tardó demasiado en abrir",
    )
    const target = computeSize(sw, sh, MAX_DIMENSION)

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) throw new Error("No se pudo procesar la imagen")
    ctx.imageSmoothingQuality = "medium"

    let bitmap: ImageBitmap | null = null
    if (typeof createImageBitmap === "function") {
      // resizeWidth/Height => el browser decodifica ya en chico (mucha menos memoria).
      try {
        bitmap = await withTimeout(
          createImageBitmap(file, {
            resizeWidth: target.width,
            resizeHeight: target.height,
            resizeQuality: "medium",
            imageOrientation: "from-image",
          } as ImageBitmapOptions),
          DECODE_TIMEOUT_MS,
          "La imagen tardó demasiado en procesarse",
        )
      } catch {
        // Si falla con resize, intentar sin resize pero igual con timeout
        bitmap = null
      }
    }

    if (bitmap) {
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height)
      bitmap.close() // liberar cuanto antes, antes de encodear
    } else {
      // Fallback: <img> + escalado en canvas. Limitar memoria evitando decodificación completa.
      canvas.width = target.width
      canvas.height = target.height

      const img = await withTimeout(
        new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image()
          // Usar la URL ya escalada por el navegador si es posible
          el.style.display = "none"
          el.onload = () => resolve(el)
          el.onerror = () => reject(new Error("No se pudo cargar la imagen"))
          el.src = url
          document.body.appendChild(el)
        }),
        DECODE_TIMEOUT_MS,
        "La imagen tardó demasiado en cargar",
      )

      try {
        // Dibujar en el tamaño reducido para evitar picos de memoria
        ctx.drawImage(img, 0, 0, target.width, target.height)
      } finally {
        // Limpiar la imagen del DOM inmediatamente
        if (img.parentElement) img.parentElement.removeChild(img)
      }
    }

    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function compressImage(file: File): Promise<File> {
  // Small files: skip work entirely.
  if (file.size < 200_000 || !file.type.startsWith("image/")) return file

  const canvas = await decodeToCanvas(file)

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
}
