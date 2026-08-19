import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/layout/page-header"
import { BillingSection } from "@/components/settings/billing-section"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, full_name, role, organizations(name, preferred_model)")
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

  // Fetch subscription with explicit zero-trust resolution via organization_id
  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("plan_id, status, current_period_start, current_period_end, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let currentPlan: { id: string; name: string; price_azn: number; document_limit: number; features: unknown } | null = null

  if (subscriptionData?.plan_id) {
    const { data: planData } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", subscriptionData.plan_id)
      .single()

    if (planData) {
      currentPlan = planData
    }
  }

  const { data: allPlans } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("price_azn", { ascending: true })

  const { count: usageCount } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .gte("billing_period_start", subscriptionData?.current_period_start ?? new Date(0).toISOString())

  const orgData = profile?.organizations as unknown as { name: string; preferred_model: string } | null
  const orgName = orgData?.name ?? ""
  const preferredModel = orgData?.preferred_model ?? "gemini-2.5-flash-latest"
  const userRole = profile?.role ?? "member"

  return (
    <div>
      <PageHeader title="Parametrlər" description="Abunəlik planı və hesab məlumatları" />
      <BillingSection
        currentPlan={currentPlan}
        subscriptionStatus={subscriptionData?.status ?? "active"}
        periodEnd={subscriptionData?.current_period_end ?? ""}
        usageCount={usageCount ?? 0}
        allPlans={allPlans ?? []}
        orgName={orgName}
        userEmail={user.email ?? ""}
        preferredModel={preferredModel}
        userRole={userRole}
      />
    </div>
  )
}
