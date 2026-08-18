"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, FileText, Loader2, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { formatDate, formatAmount } from "@/lib/utils"
import { useState, useCallback } from "react"

interface Document {
  id: string
  original_filename: string
  status: string
  raw_extraction: Record<string, unknown> | null
  edited_fields: Record<string, unknown> | null
  created_at: string
  file_size_bytes: number
  document_line_items?: Array<{
    line_number: number
    description: string | null
    amount: number | null
    currency: string | null
    date: string | null
    category: string | null
  }>
}

interface DocumentTableProps {
  documents: Document[]
  totalCount: number
  currentPage: number
  pageSize: number
}

// What the confirmation dialog is about to delete.
// null  → dialog closed
// { ids, label } → dialog open
type PendingDelete = { ids: string[]; label: string } | null

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "processing" | "destructive" | "outline" }> = {
    pending:    { label: "Gözləyir",   variant: "secondary"   },
    processing: { label: "Emal olunur", variant: "processing" },
    done:       { label: "Tamamlandı", variant: "success"     },
    error:      { label: "Xəta",       variant: "destructive" },
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
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [exporting, setExporting]       = useState(false)
  const [exporting1C, setExporting1C]   = useState(false)
  const [exportingLineItems, setExportingLineItems] = useState(false)
  const [exporting1CLineItems, setExporting1CLineItems] = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)

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

  // Ask for confirmation before deleting one row.
  function requestDeleteOne(doc: Document) {
    setPendingDelete({ ids: [doc.id], label: doc.original_filename })
  }

  // Ask for confirmation before bulk-deleting selected rows.
  function requestDeleteSelected() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setPendingDelete({ ids, label: `${ids.length} sənəd` })
  }

  // Called after the user confirms the dialog.
  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await Promise.all(
        pendingDelete.ids.map((id) =>
          fetch(`/api/documents/${id}`, { method: "DELETE" }).then((r) => {
            if (!r.ok) throw new Error(`Delete failed for ${id}`)
          })
        )
      )
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pendingDelete.ids.forEach((id) => next.delete(id))
        return next
      })
      setPendingDelete(null)
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }, [pendingDelete, router])

  async function handleExport(format: "excel" | "1c" = "excel") {
    const isExcel = format === "excel"
    isExcel ? setExporting(true) : setExporting1C(true)
    try {
      const endpoint = isExcel ? "/api/export" : "/api/export-1c"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: selectedIds.size > 0 ? Array.from(selectedIds) : undefined }),
      })
      if (!res.ok) throw new Error("Export xətası")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const extension = isExcel ? "xlsx" : "xml"
      const prefix    = isExcel ? "hesab-senedler" : "1c-senedler"
      a.download = `${prefix}-${new Date().toISOString().split("T")[0]}.${extension}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      isExcel ? setExporting(false) : setExporting1C(false)
    }
  }

  async function handleExportLineItems(format: "excel" | "1c" = "excel") {
    const isExcel = format === "excel"
    isExcel ? setExportingLineItems(true) : setExporting1CLineItems(true)
    try {
      const endpoint = isExcel ? "/api/export-line-items" : "/api/export-1c-line-items"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: selectedIds.size > 0 ? Array.from(selectedIds) : undefined }),
      })
      if (!res.ok) throw new Error("Export xətası")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const extension = isExcel ? "xlsx" : "xml"
      const prefix    = isExcel ? "line-items" : "1c-line-items"
      a.download = `${prefix}-${new Date().toISOString().split("T")[0]}.${extension}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      isExcel ? setExportingLineItems(false) : setExporting1CLineItems(false)
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
    <>
      {/* ── Confirmation dialog ──────────────────────────────── */}
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sənədi sil</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-slate-800">{pendingDelete?.label}</span> silinəcək.
              Bu əməliyyat geri alına bilməz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm" disabled={deleting}>Ləğv et</Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Table card ──────────────────────────────────────── */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 gap-4 flex-wrap">
          <p className="text-sm text-slate-500">
            Cəmi <span className="font-medium text-slate-900">{totalCount}</span> sənəd
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("excel")}
              disabled={exporting || exporting1C || exportingLineItems || exporting1CLineItems}
            >
              {exporting ? <Loader2 className="animate-spin" /> : null}
              Excel ({selectedIds.size > 0 ? selectedIds.size : "hamısı"})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("1c")}
              disabled={exporting || exporting1C || exportingLineItems || exporting1CLineItems}
            >
              {exporting1C ? <Loader2 className="animate-spin" /> : null}
              1C XML ({selectedIds.size > 0 ? selectedIds.size : "hamısı"})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportLineItems("excel")}
              disabled={exporting || exporting1C || exportingLineItems || exporting1CLineItems}
            >
              {exportingLineItems ? <Loader2 className="animate-spin" /> : null}
              Excel (Line Items)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportLineItems("1c")}
              disabled={exporting || exporting1C || exportingLineItems || exporting1CLineItems}
            >
              {exporting1CLineItems ? <Loader2 className="animate-spin" /> : null}
              1C XML (Line Items)
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={requestDeleteSelected}
                disabled={deleting}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Sil ({selectedIds.size})
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="w-10 pl-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === documents.length && documents.length > 0}
                    onChange={toggleAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs sm:text-sm">Fayl adı</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs sm:text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs sm:text-sm">Satıcı</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs sm:text-sm">Məbləğ</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs sm:text-sm">Tarix</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs sm:text-sm">Yüklənmə</th>
                {/* actions: view + delete */}
                <th className="w-20 py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => {
                const fields = (doc.edited_fields && Object.keys(doc.edited_fields).length > 0
                  ? doc.edited_fields
                  : doc.raw_extraction) ?? {}

                // If document has line items, sum their amounts for display
                let displayAmount: number | null = fields.amount as number | null
                let displayCurrency: string | null = fields.currency as string | null

                if (doc.document_line_items && doc.document_line_items.length > 0) {
                  const total = doc.document_line_items.reduce((sum, item) => sum + (item.amount ?? 0), 0)
                  displayAmount = total
                  // Use first line item's currency or fallback to document currency
                  displayCurrency = doc.document_line_items[0]?.currency || displayCurrency
                }

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
                      {formatAmount(displayAmount, displayCurrency)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(fields.date as string | null)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/documents/${doc.id}`}>
                          <Button size="icon" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => requestDeleteOne(doc)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
    </>
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
