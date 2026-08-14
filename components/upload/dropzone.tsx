"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, X, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, formatFileSize } from "@/lib/utils"
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validation/schemas"

type UploadState = "idle" | "uploading" | "extracting" | "polling" | "error"

export function Dropzone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  function validateFile(f: File): string | null {
    if (!ALLOWED_FILE_TYPES.includes(f.type as typeof ALLOWED_FILE_TYPES[number])) {
      return "Yalnız JPG, PNG, WebP və PDF faylları qəbul olunur"
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return `Fayl ölçüsü 10 MB-dan çox olmamalıdır (${formatFileSize(f.size)})`
    }
    return null
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) selectFile(dropped)
  }

  function selectFile(f: File) {
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setFile(f)
  }

  const startUpload = useCallback(async () => {
    if (!file) return
    setError(null)
    setState("uploading")
    setProgress(20)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) {
        const body = await uploadRes.json()
        throw new Error(body.error ?? "Yükləmə xətası")
      }

      const { id } = await uploadRes.json()
      setProgress(45)
      setState("extracting")

      const extractRes = await fetch(`/api/extract/${id}`, { method: "POST" })
      if (!extractRes.ok) {
        const body = await extractRes.json()
        throw new Error(body.error ?? "Çıxarma xətası")
      }

      setProgress(70)
      setState("polling")

      // Poll until done or error
      let attempts = 0
      const maxAttempts = 30
      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000))
        const statusRes = await fetch(`/api/documents/${id}`)
        if (!statusRes.ok) break
        const doc = await statusRes.json()
        if (doc.status === "done") {
          setProgress(100)
          router.push(`/documents/${id}`)
          return
        }
        if (doc.status === "error") {
          throw new Error(doc.extraction_error ?? "AI çıxarma xətası baş verdi")
        }
        attempts++
        setProgress(70 + Math.min(25, attempts * 2))
      }

      throw new Error("Emal zaman aşımına uğradı")
    } catch (err) {
      setState("error")
      setError(err instanceof Error ? err.message : "Gözlənilməz xəta")
      setProgress(0)
    }
  }, [file, router])

  const isProcessing = state === "uploading" || state === "extracting" || state === "polling"

  return (
    <div className="max-w-2xl">
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 cursor-pointer transition-all duration-200 bg-white",
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-slate-300 hover:border-primary/60 hover:bg-slate-50/50"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_FILE_TYPES.join(",")}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && selectFile(e.target.files[0])}
          />
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors",
            dragOver ? "bg-primary/15" : "bg-slate-100"
          )}>
            <Upload className={cn("w-7 h-7", dragOver ? "text-primary" : "text-slate-400")} />
          </div>
          <p className="text-base font-medium text-slate-900 mb-1">
            Faylı bura sürükleyin və ya seçin
          </p>
          <p className="text-sm text-slate-500">JPG, PNG, WebP, PDF · Maks. 10 MB</p>
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-4 p-5 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{file.name}</p>
              <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
            </div>
            {!isProcessing && (
              <button
                onClick={() => { setFile(null); setError(null); setState("idle") }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isProcessing ? (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-slate-700 font-medium">
                  {state === "uploading" && "Fayl yüklənir…"}
                  {state === "extracting" && "AI sənədi emal edir…"}
                  {state === "polling" && "Nəticə gözlənilir…"}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Bu proses 15–30 saniyə çəkə bilər
              </p>
            </div>
          ) : state === "error" ? (
            <div className="p-6">
              <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4 mb-4">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={startUpload} size="sm">Yenidən cəhd et</Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setFile(null); setError(null); setState("idle") }}
                >
                  Faylı dəyiş
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <Button onClick={startUpload} className="w-full" size="lg">
                <Upload className="w-4 h-4" />
                Yüklə və emal et
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { step: "1", title: "Yükləyin", desc: "Faktura və ya qəbzinizi seçin" },
          { step: "2", title: "AI emal edir", desc: "Gemini AI məlumatları çıxarır" },
          { step: "3", title: "Yoxlayın", desc: "Nəticəni yoxlayın və düzəldin" },
        ].map(({ step, title, desc }) => (
          <div key={step} className="text-center p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center mx-auto mb-2">
              {step}
            </div>
            <p className="text-sm font-medium text-slate-900">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
