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

    // Check if profile already exists (user already registered)
    const { data: existingProfile } = await (admin
      .from("profiles") as any)
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { error: "Profil artıq mövcuddur", alreadyExists: true },
        { status: 409 }
      )
    }

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

    if (profileError) {
      // Check for foreign key violation (23503) which means user doesn't exist in auth.users
      if (profileError.code === "23503" || profileError.message?.includes("profiles_id_fkey")) {
        return NextResponse.json(
          { error: "İstifadəçi tapılmadı", alreadyExists: true },
          { status: 409 }
        )
      }
      throw profileError
    }

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
