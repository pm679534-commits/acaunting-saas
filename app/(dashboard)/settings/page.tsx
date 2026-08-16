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

  // Fetch subscription, plans, and usage in parallel
  const [subscriptionResult, plansResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, subscription_plans(*)")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscription_plans")
      .select("*")
      .order("price_azn", { ascending: true })
  ])

  const subscription = subscriptionResult.data
  const plans = plansResult.data

  const { count: usageCount } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .gte("billing_period_start", subscription?.current_period_start ?? new Date(0).toISOString())

  const orgData = profile?.organizations as unknown as { name: string; preferred_model: string } | null
  const orgName = orgData?.name ?? ""
  const preferredModel = orgData?.preferred_model ?? "gemini-2.5-flash-latest"
  const userRole = profile?.role ?? "member"

  return (
    <div>
      <PageHeader title="Parametrlər" description="Abunəlik planı və hesab məlumatları" />
      <BillingSection
        currentPlan={subscription?.subscription_plans as Record<string, unknown> | null}
        subscriptionStatus={subscription?.status ?? "active"}
        periodEnd={subscription?.current_period_end ?? ""}
        usageCount={usageCount ?? 0}
        allPlans={plans ?? []}
        orgName={orgName}
        userEmail={user.email ?? ""}
        preferredModel={preferredModel}
        userRole={userRole}
      />
    </div>
  )
}
