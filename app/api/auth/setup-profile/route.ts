import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { fullName, orgName, userId } = await request.json()

    if (!fullName || !orgName || !userId) {
      return NextResponse.json({ error: "Məlumatlar natamamdır" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Create organization
    const { data: org, error: orgError } = await (admin
      .from("organizations") as any)
      .insert({ name: orgName })
      .select("id")
      .single()

    if (orgError) throw orgError

    // Create profile
    const { error: profileError } = await (admin.from("profiles") as any).upsert({
      id: userId,
      organization_id: org.id,
      full_name: fullName,
      role: "owner",
    })

    if (profileError) throw profileError

    // Create starter subscription
    const { error: subError } = await (admin.from("subscriptions") as any).insert({
      organization_id: org.id,
      plan_id: "starter",
      status: "trialing",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (subError) throw subError

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("setup-profile error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server xətası" },
      { status: 500 }
    )
  }
}
