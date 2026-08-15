"use client"

import { useState } from "react"
import { Check, Edit2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, formatDate, formatAmount } from "@/lib/utils"
import { useToast } from "@/lib/hooks/use-toast"

interface Document {
  id: string
  status: string
  raw_extraction: Record<string, unknown> | null
  edited_fields: Record<string, unknown> | null
  finalized_at: string | null
  extraction_error: string | null
}

const CATEGORIES = [
  "Mal/Xidmət",
  "Yanacaq",
  "Nəqliyyat",
  "Kommunal",
  "Əmək haqqı",
  "Digər",
]

const CURRENCIES = ["AZN", "USD", "EUR", "TRY", "RUB"]

interface FieldRowProps {
  label: string
  fieldKey: string
  value: string | number | null
  editedValue: string | number | null
  onEdit: (key: string, value: string | number | null) => void
  confidence?: number
  type?: "text" | "number" | "date" | "select-category" | "select-currency"
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        confidence >= 0.8 ? "bg-emerald-400" : confidence >= 0.5 ? "bg-amber-400" : "bg-red-400"
      )}
      title={`Etibarlılıq: ${Math.round(confidence * 100)}%`}
    />
  )
}

function FieldRow({ label, fieldKey, value, editedValue, onEdit, confidence, type = "text" }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>("")
  const isEdited = editedValue !== null && editedValue !== value

  function startEdit() {
    setDraft(String(editedValue ?? value ?? ""))
    setEditing(true)
  }

  function commit() {
    if (type === "number") {
      const n = parseFloat(draft)
      onEdit(fieldKey, isNaN(n) ? null : n)
    } else {
      onEdit(fieldKey, draft || null)
    }
    setEditing(false)
  }

  const displayValue = editedValue ?? value

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3.5 px-4 sm:px-5 w-36 sm:w-48">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-medium text-slate-500">{label}</span>
          {confidence !== undefined && <ConfidenceDot confidence={confidence} />}
        </div>
      </td>
      <td className="py-3 px-4 sm:px-5">
        {editing ? (
          <div className="flex items-center gap-2">
            {type === "select-category" ? (
              <Select value={draft} onValueChange={(v) => { setDraft(v); onEdit(fieldKey, v); setEditing(false) }}>
                <SelectTrigger className="h-8 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : type === "select-currency" ? (
              <Select value={draft} onValueChange={(v) => { setDraft(v); onEdit(fieldKey, v); setEditing(false) }}>
                <SelectTrigger className="h-8 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false) }}
                type={type === "number" ? "number" : type === "date" ? "date" : "text"}
                className="h-8 w-56 text-sm"
              />
            )}
            {type !== "select-category" && type !== "select-currency" && (
              <>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={commit}>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}>
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="group flex items-center gap-2 text-sm text-slate-900 hover:text-primary transition-colors rounded px-1 -mx-1 py-0.5"
          >
            <span className={cn("font-medium", !displayValue && "text-slate-400 italic")}>
              {displayValue
                ? fieldKey === "amount"
                  ? String(displayValue)
                  : String(displayValue)
                : "Tapılmadı"}
            </span>
            {isEdited && (
              <Badge variant="outline" className="text-[10px] py-0 text-indigo-600 border-indigo-200">
                Redaktə edildi
              </Badge>
            )}
            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </td>
    </tr>
  )
}

export function ReviewTable({ document: doc }: { document: Document }) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const base = doc.raw_extraction ?? {}
  const [fields, setFields] = useState<Record<string, unknown>>(
    doc.edited_fields && Object.keys(doc.edited_fields).length > 0
      ? { ...base, ...doc.edited_fields }
      : { ...base }
  )

  function onEdit(key: string, value: unknown) {
    setFields((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited_fields: fields }),
      })
      if (!res.ok) throw new Error("Yadda saxlama xətası")
      setSaved(true)
      toast({ title: "Saxlanıldı", description: "Düzəlişlər uğurla yadda saxlanıldı", variant: "success" })
    } catch (err) {
      toast({ title: "Xəta", description: err instanceof Error ? err.message : "Xəta", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (doc.status === "processing") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-3 text-slate-500">
        <Loader2 className="animate-spin w-5 h-5" />
        <span>Sənəd emal olunur…</span>
      </div>
    )
  }

  if (doc.status === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-red-800">Çıxarma xətası</p>
          <p className="text-sm text-red-600 mt-1">{doc.extraction_error ?? "Bilinməyən xəta"}</p>
        </div>
      </div>
    )
  }

  const confidence = (base.confidence as number) ?? 0.8

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-slate-900">Çıxarılmış məlumatlar</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Ümumi etibarlılıq:</span>
            <Badge
              variant={confidence >= 0.8 ? "success" : confidence >= 0.5 ? "warning" : "destructive"}
            >
              {Math.round(confidence * 100)}%
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <tbody>
            <FieldRow label="Tarix" fieldKey="date" value={base.date as string ?? null} editedValue={fields.date as string ?? null} onEdit={onEdit} confidence={confidence} type="date" />
            <FieldRow label="Satıcı adı" fieldKey="vendor_name" value={base.vendor_name as string ?? null} editedValue={fields.vendor_name as string ?? null} onEdit={onEdit} confidence={confidence} />
            <FieldRow label="VÖEN" fieldKey="tax_id" value={base.tax_id as string ?? null} editedValue={fields.tax_id as string ?? null} onEdit={onEdit} confidence={confidence} />
            <FieldRow label="Məbləğ" fieldKey="amount" value={base.amount as number ?? null} editedValue={fields.amount as number ?? null} onEdit={onEdit} confidence={confidence} type="number" />
            <FieldRow label="Valyuta" fieldKey="currency" value={base.currency as string ?? null} editedValue={fields.currency as string ?? null} onEdit={onEdit} confidence={confidence} type="select-currency" />
            <FieldRow label="Kateqoriya" fieldKey="category" value={base.category as string ?? null} editedValue={fields.category as string ?? null} onEdit={onEdit} confidence={confidence} type="select-category" />
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={saving || saved}>
          {saving ? <Loader2 className="animate-spin" /> : saved ? <CheckCircle2 className="text-emerald-400" /> : null}
          {saved ? "Saxlanıldı" : "Dəyişiklikləri saxla"}
        </Button>
        <p className="text-xs text-slate-400">
          Sahəyə klikləyin ki düzəliş edəsiniz · Enter — təsdiq, Escape — ləğv
        </p>
      </div>
    </div>
  )
}
