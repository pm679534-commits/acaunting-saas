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
    .select("id, original_filename, status, file_size_bytes, created_at, raw_extraction, edited_fields, document_line_items(line_number, description, amount, currency, date, category, quantity, unit)", { count: "exact" })
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

  // Fetch active subscription with explicit zero-trust resolution via organization_id
  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select(`
      plan_id,
      current_period_start,
      current_period_end,
      status
    `)
    .eq("organization_id", profile.organization_id)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Resolve plan details from subscription_plans table (no hardcoded fallbacks)
  let planLimit: number
  let planName: string
  let periodStart: string

  if (subscriptionData?.plan_id) {
    // User has an active subscription - fetch the plan details
    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("document_limit, name")
      .eq("id", subscriptionData.plan_id)
      .single()

    if (planError || !planData) {
      // Subscription plan_id is invalid - fallback to database starter plan
      const { data: starterPlan } = await supabase
        .from("subscription_plans")
        .select("document_limit, name")
        .eq("id", "starter")
        .single()

      planLimit = starterPlan?.document_limit ?? 5
      planName = starterPlan?.name ?? "Başlanğıc"
    } else {
      planLimit = planData.document_limit
      planName = planData.name
    }

    periodStart = subscriptionData.current_period_start
  } else {
    // No active subscription - fetch starter plan from database
    const { data: starterPlan } = await supabase
      .from("subscription_plans")
      .select("document_limit, name")
      .eq("id", "starter")
      .single()

    planLimit = starterPlan?.document_limit ?? 5
    planName = starterPlan?.name ?? "Başlanğıc"
    periodStart = new Date(0).toISOString()
  }

  // Fetch usage count for current billing period
  const { count: usageCount } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .gte("billing_period_start", periodStart)

  const limitExceeded = (usageCount ?? 0) >= planLimit

  return (
    <div>
      <PageHeader
        title="İdarə paneli"
        description="Yüklənmiş sənədlərinizin siyahısı"
      >
        <Button asChild disabled={limitExceeded}>
          <Link href="/upload" prefetch={true}>
            <Upload className="w-4 h-4" />
            Sənəd yüklə
          </Link>
        </Button>
      </PageHeader>

      <UsageMeter
        used={usageCount ?? 0}
        limit={planLimit}
        planName={planName}
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
