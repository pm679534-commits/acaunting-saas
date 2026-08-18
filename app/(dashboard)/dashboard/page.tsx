import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/layout/page-header"
import { DocumentTable } from "@/components/dashboard/document-table"
import { DocumentFilters } from "@/components/dashboard/document-filters"
import { UsageMeter } from "@/components/dashboard/usage-meter"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Upload } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface SearchParams {
  page?: string
  status?: string
  search?: string
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1"))
  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-slate-900">Profil tapılmadı</h1>
          <p className="text-slate-600">Zəhmət olmasa dəstək ilə əlaqə saxlayın.</p>
          {profileError && (
            <p className="text-xs text-red-600 mt-2">{profileError.message}</p>
          )}
        </div>
      </div>
    )
  }

  let query = supabase
    .from("documents")
    .select("*, document_line_items(line_number, description, amount, currency, date, category)", { count: "exact" })
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (params.status) query = query.eq("status", params.status)
  if (params.search) {
    query = query.or(
      `original_filename.ilike.%${params.search}%,raw_extraction->>vendor_name.ilike.%${params.search}%`
    )
  }

  const { data: documents, count } = await query

  // Fetch subscription and usage in parallel — include trialing so new users see their plan
  const [subscriptionResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_id, current_period_start, current_period_end, subscription_plans(document_limit, name)")
      .eq("organization_id", profile.organization_id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const subscription = subscriptionResult.data

  // Only fetch usage count if subscription exists
  const usageCount = subscription
    ? (await supabase
        .from("usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)
        .gte("billing_period_start", subscription.current_period_start ?? new Date(0).toISOString())).count
    : 0

  const plan = subscription?.subscription_plans as unknown as { document_limit: number; name: string } | null

  return (
    <div>
      <PageHeader
        title="İdarə paneli"
        description="Yüklənmiş sənədlərinizin siyahısı"
      >
        <Button asChild>
          <Link href="/upload">
            <Upload className="w-4 h-4" />
            Sənəd yüklə
          </Link>
        </Button>
      </PageHeader>

      <UsageMeter
        used={usageCount ?? 0}
        limit={plan?.document_limit ?? 5}
        planName={plan?.name ?? "Başlanğıc"}
      />

      <div className="mt-6">
        <DocumentFilters
          currentStatus={params.status}
          currentSearch={params.search}
        />
        <DocumentTable
          documents={documents ?? []}
          totalCount={count ?? 0}
          currentPage={page}
          pageSize={pageSize}
        />
      </div>
    </div>
  )
}
