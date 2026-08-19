"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCallback, useState, useEffect } from "react"
import { useDebounce } from "@/lib/hooks/use-debounce"

const STATUSES = [
  { value: "pending", label: "Gözləyir" },
  { value: "processing", label: "Emal olunur" },
  { value: "done", label: "Tamamlandı" },
  { value: "error", label: "Xəta" },
]

interface DocumentFiltersProps {
  currentStatus?: string
  currentSearch?: string
}

export function DocumentFilters({ currentStatus, currentSearch }: DocumentFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentSearch ?? "")
  const debouncedSearch = useDebounce(search, 250)
  const [isSearching, setIsSearching] = useState(false)

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete("page")
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      setIsSearching(false)
      updateParam("search", debouncedSearch || undefined)
    }
  }, [debouncedSearch, currentSearch, updateParam])

  useEffect(() => {
    if (search !== debouncedSearch) {
      setIsSearching(true)
    }
  }, [search, debouncedSearch])

  function clearAll() {
    setSearch("")
    router.push("/dashboard")
  }

  const hasFilters = !!currentStatus || !!currentSearch

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          placeholder="Fayl adı və ya satıcı axtar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin pointer-events-none" />
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam("status", currentStatus === value ? undefined : value)}
            className="focus:outline-none"
          >
            <Badge
              variant={currentStatus === value ? "default" : "outline"}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              {label}
            </Badge>
          </button>
        ))}
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-slate-500">
          <X className="w-3.5 h-3.5 mr-1" />
          Filtrləri sil
        </Button>
      )}
    </div>
  )
}
