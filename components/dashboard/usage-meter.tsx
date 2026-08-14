import { Progress } from "@/components/ui/progress"
import { TrendingUp } from "lucide-react"
import Link from "next/link"

interface UsageMeterProps {
  used: number
  limit: number
  planName: string
}

export function UsageMeter({ used, limit, planName }: UsageMeterProps) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const nearLimit = pct >= 80

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-center gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Bu ay istifadə</span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{planName}</span>
          </div>
          <span className={`text-sm font-semibold ${nearLimit ? "text-amber-600" : "text-slate-900"}`}>
            {used} / {limit} sənəd
          </span>
        </div>
        <Progress
          value={pct}
          className={nearLimit ? "[&>div]:bg-amber-500" : ""}
        />
        {nearLimit && (
          <p className="mt-1.5 text-xs text-amber-600">
            Limitə yaxınlaşırsız.{" "}
            <Link href="/settings" className="underline font-medium">
              Planı yüksəldin
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
