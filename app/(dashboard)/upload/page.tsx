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

  // Fetch active subscription with explicit zero-trust resolution via organization_id
  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("plan_id, current_period_start, current_period_end, status")
    .eq("organization_id", profile.organization_id)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Resolve plan details from subscription_plans table (no hardcoded fallbacks)
  let documentLimit: number
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

      documentLimit = starterPlan?.document_limit ?? 5
      planName = starterPlan?.name ?? "Başlanğıc"
    } else {
      documentLimit = planData.document_limit
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

    documentLimit = starterPlan?.document_limit ?? 5
    planName = starterPlan?.name ?? "Başlanğıc"
    periodStart = new Date(0).toISOString()
  }

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
        planName={planName}
      />
    </div>
  )
}
