import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/layout/page-header"
import { DocumentTable } from "@/components/dashboard/document-table"
import { DocumentFilters } from "@/components/dashboard/document-filters"
import { UsageMeter } from "@/components/dashboard/usage-meter"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Upload } from "lucide-react"

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) redirect("/login")

  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
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

  // Usage this billing period
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id, current_period_start, current_period_end, subscription_plans(document_limit, name)")
    .eq("organization_id", profile.organization_id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const { count: usageCount } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .gte("billing_period_start", subscription?.current_period_start ?? new Date(0).toISOString())

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
        limit={plan?.document_limit ?? 100}
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
