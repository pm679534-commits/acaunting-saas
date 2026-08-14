"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, FileText, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatAmount } from "@/lib/utils"
import { useState } from "react"

interface Document {
  id: string
  original_filename: string
  status: string
  raw_extraction: Record<string, unknown> | null
  edited_fields: Record<string, unknown> | null
  created_at: string
  file_size_bytes: number
}

interface DocumentTableProps {
  documents: Document[]
  totalCount: number
  currentPage: number
  pageSize: number
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "processing" | "destructive" | "outline" }> = {
    pending: { label: "Gözləyir", variant: "secondary" },
    processing: { label: "Emal olunur", variant: "processing" },
    done: { label: "Tamamlandı", variant: "success" },
    error: { label: "Xəta", variant: "destructive" },
  }
  const { label, variant } = map[status] ?? { label: status, variant: "outline" }
  return (
    <Badge variant={variant} className="flex items-center gap-1 w-fit">
      {status === "processing" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {label}
    </Badge>
  )
}

export function DocumentTable({ documents, totalCount, currentPage, pageSize }: DocumentTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  const totalPages = Math.ceil(totalCount / pageSize)

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)))
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: selectedIds.size > 0 ? Array.from(selectedIds) : undefined }),
      })
      if (!res.ok) throw new Error("Export xətası")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `hesab-senedler-${new Date().toISOString().split("T")[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  if (documents.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center py-16 gap-3">
        <FileText className="w-10 h-10 text-slate-300" />
        <p className="text-slate-500 font-medium">Hələ sənəd yüklənməyib</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/upload">İlk sənədi yüklə</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="text-sm text-slate-500">
          Cəmi <span className="font-medium text-slate-900">{totalCount}</span> sənəd
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="animate-spin" /> : null}
          {selectedIds.size > 0 ? `${selectedIds.size} sənədi` : "Hamısını"} export et
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="w-10 pl-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === documents.length}
                  onChange={toggleAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Fayl adı</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Satıcı</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Məbləğ</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Tarix</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Yüklənmə</th>
              <th className="w-12 py-3 px-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc) => {
              const fields = (doc.edited_fields && Object.keys(doc.edited_fields).length > 0
                ? doc.edited_fields
                : doc.raw_extraction) ?? {}
              return (
                <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="pl-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-900 truncate max-w-[180px]">
                        {doc.original_filename}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {(fields.vendor_name as string) ?? "—"}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                    {formatAmount(fields.amount as number | null, fields.currency as string | null)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {formatDate(fields.date as string | null)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-xs">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="py-3.5 px-4">
                    <Link href={`/documents/${doc.id}`}>
                      <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Səhifə {currentPage} / {totalPages}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`?page=${currentPage - 1}`)}
              >
                Əvvəlki
              </Button>
            )}
            {currentPage < totalPages && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`?page=${currentPage + 1}`)}
              >
                Növbəti
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function DocumentTableSkeleton() {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <Skeleton className="h-4 w-32" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-slate-100">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
