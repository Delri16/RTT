export async function compressImage(file: File, maxWidth = 480, quality = 0.4): Promise<File> {
  return new Promise((resolve, reject) => {
    if (file.size < 50000) {
      resolve(file)
      return
    }

    console.log(`[v0] Starting compression for ${file.name}: ${(file.size / 1024).toFixed(0)}KB`)

    const reader = new FileReader()

    const timeout = setTimeout(() => {
      reader.abort()
      reject(new Error("Image compression timeout"))
    }, 20000) // 20 second timeout

    reader.onload = (e) => {
      clearTimeout(timeout)
      const img = new Image()

      img.onload = () => {
        try {
          // Calculate new dimensions
          let width = img.width
          let height = img.height

          console.log(`[v0] Original dimensions: ${width}x${height}`)

          const maxPixels = 480 * 480
          const currentPixels = width * height

          if (currentPixels > maxPixels) {
            const scale = Math.sqrt(maxPixels / currentPixels)
            width = Math.floor(width * scale)
            height = Math.floor(height * scale)
          } else if (width > maxWidth || height > maxWidth) {
            const aspectRatio = width / height
            if (width > height) {
              width = maxWidth
              height = Math.floor(maxWidth / aspectRatio)
            } else {
              height = maxWidth
              width = Math.floor(maxWidth * aspectRatio)
            }
          }

          console.log(`[v0] Compressed dimensions: ${width}x${height}`)

          // Create canvas
          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height

          // Draw and compress
          const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false })
          if (!ctx) {
            reject(new Error("Could not get canvas context"))
            return
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "medium" // Changed from "high" to "medium" for speed
          ctx.drawImage(img, 0, 0, width, height)

          const maxSize = 800000

          const cleanup = () => {
            try {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              canvas.width = 0
              canvas.height = 0
              img.src = ""
            } catch (e) {
              console.error("[v0] Cleanup error:", e)
            }
          }

          // Convert to blob with appropriate quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                cleanup()
                reject(new Error("Could not compress image"))
                return
              }

              if (blob.size > maxSize) {
                console.log(`[v0] First pass: ${(blob.size / 1024).toFixed(0)}KB, applying second pass`)
                canvas.toBlob(
                  (secondBlob) => {
                    if (!secondBlob) {
                      cleanup()
                      reject(new Error("Could not compress image"))
                      return
                    }

                    if (secondBlob.size > maxSize) {
                      console.log(`[v0] Second pass: ${(secondBlob.size / 1024).toFixed(0)}KB, applying third pass`)
                      canvas.toBlob(
                        (thirdBlob) => {
                          if (!thirdBlob) {
                            cleanup()
                            reject(new Error("Could not compress image"))
                            return
                          }

                          const compressedFile = new File([thirdBlob], file.name, {
                            type: "image/jpeg",
                            lastModified: Date.now(),
                          })

                          console.log(
                            `[v0] Image compressed (3rd pass): ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`,
                          )

                          cleanup()
                          resolve(compressedFile)
                        },
                        "image/jpeg",
                        0.15,
                      )
                    } else {
                      const compressedFile = new File([secondBlob], file.name, {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                      })

                      console.log(
                        `[v0] Image compressed (2nd pass): ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`,
                      )

                      cleanup()
                      resolve(compressedFile)
                    }
                  },
                  "image/jpeg",
                  0.25,
                )
              } else {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })

                console.log(
                  `[v0] Image compressed (1st pass): ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`,
                )

                cleanup()
                resolve(compressedFile)
              }
            },
            "image/jpeg",
            quality,
          )
        } catch (error) {
          console.error("[v0] Compression error:", error)
          reject(error)
        }
      }

      img.onerror = () => {
        clearTimeout(timeout)
        reject(new Error("Could not load image"))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      clearTimeout(timeout)
      reject(new Error("Could not read file"))
    }

    reader.readAsDataURL(file)
  })
}
