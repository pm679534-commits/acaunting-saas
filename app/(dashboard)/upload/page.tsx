import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/layout/page-header"
import { Dropzone } from "@/components/upload/dropzone"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
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
        </div>
      </div>
    )
  }

  // Fetch subscription and usage to determine if limit is reached
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id, current_period_start, current_period_end, subscription_plans(document_limit, name)")
    .eq("organization_id", profile.organization_id)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const plan = subscription?.subscription_plans as unknown as { document_limit: number; name: string } | null
  const documentLimit = plan?.document_limit ?? 5
  const periodStart = subscription?.current_period_start ?? new Date(0).toISOString()

  // Count documents in current billing period
  const { count: currentUsage } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .gte("created_at", periodStart)

  const usage = currentUsage ?? 0
  const limitExceeded = usage >= documentLimit

  return (
    <div>
      <PageHeader
        title="Sənəd yüklə"
        description="Faktura və ya qəbzinizi yükləyin, AI məlumatları avtomatik çıxarsın"
      />
      <Dropzone
        limitExceeded={limitExceeded}
        currentUsage={usage}
        monthlyLimit={documentLimit}
        planName={plan?.name ?? "Başlanğıc"}
      />
    </div>
  )
}
