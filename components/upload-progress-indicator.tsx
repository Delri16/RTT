"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, CheckCircle, XCircle } from "lucide-react"

interface UploadTask {
  id: string
  status: "uploading" | "success" | "error"
  progress: number
  message: string
}

export default function UploadProgressIndicator() {
  const [tasks, setTasks] = useState<UploadTask[]>([])

  useEffect(() => {
    // Listen for upload events
    const handleUploadStart = (e: CustomEvent) => {
      setTasks((prev) => [
        ...prev,
        {
          id: e.detail.id,
          status: "uploading",
          progress: 0,
          message: e.detail.message || "Subiendo fotos...",
        },
      ])
    }

    const handleUploadProgress = (e: CustomEvent) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === e.detail.id ? { ...task, progress: e.detail.progress } : task)),
      )
    }

    const handleUploadComplete = (e: CustomEvent) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === e.detail.id ? { ...task, status: "success", progress: 100, message: "Subida completada" } : task,
        ),
      )

      // Remove after 3 seconds
      setTimeout(() => {
        setTasks((prev) => prev.filter((task) => task.id !== e.detail.id))
      }, 3000)
    }

    const handleUploadError = (e: CustomEvent) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === e.detail.id ? { ...task, status: "error", message: e.detail.error || "Error al subir" } : task,
        ),
      )

      // Remove after 5 seconds
      setTimeout(() => {
        setTasks((prev) => prev.filter((task) => task.id !== e.detail.id))
      }, 5000)
    }

    window.addEventListener("upload:start" as any, handleUploadStart)
    window.addEventListener("upload:progress" as any, handleUploadProgress)
    window.addEventListener("upload:complete" as any, handleUploadComplete)
    window.addEventListener("upload:error" as any, handleUploadError)

    return () => {
      window.removeEventListener("upload:start" as any, handleUploadStart)
      window.removeEventListener("upload:progress" as any, handleUploadProgress)
      window.removeEventListener("upload:complete" as any, handleUploadComplete)
      window.removeEventListener("upload:error" as any, handleUploadError)
    }
  }, [])

  if (tasks.length === 0) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 space-y-2">
      {tasks.map((task) => (
        <Card key={task.id} className="bg-white shadow-lg p-4">
          <div className="flex items-center gap-3">
            {task.status === "uploading" && <Upload className="w-5 h-5 text-toro-primary animate-pulse" />}
            {task.status === "success" && <CheckCircle className="w-5 h-5 text-green-500" />}
            {task.status === "error" && <XCircle className="w-5 h-5 text-red-500" />}

            <div className="flex-1">
              <p className="text-sm font-medium">{task.message}</p>
              {task.status === "uploading" && <Progress value={task.progress} className="mt-2 h-2" />}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
