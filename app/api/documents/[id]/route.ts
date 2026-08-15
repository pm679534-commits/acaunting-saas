import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { patchDocumentSchema } from "@/lib/validation/schemas"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 })

  const { data: doc, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !doc) return NextResponse.json({ error: "Sənəd tapılmadı" }, { status: 404 })

  return NextResponse.json(doc)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return NextResponse.json({ error: "Profil tapılmadı" }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Yanlış JSON" }, { status: 400 })
  }

  const parsed = patchDocumentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const admin = createAdminClient()
  const { data: existing } = await (admin
    .from("documents") as any)
    .select("id, organization_id, finalized_at")
    .eq("id", id)
    .single()

  if (!existing || existing.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: "Sənəd tapılmadı" }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = {
    edited_fields: parsed.data.edited_fields,
    updated_at: new Date().toISOString(),
  }

  if (!existing.finalized_at || parsed.data.finalized) {
    updatePayload.finalized_at = new Date().toISOString()
  }

  const { error: updateError } = await (admin
    .from("documents") as any)
    .update(updatePayload)
    .eq("id", id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return NextResponse.json({ error: "Profil tapılmadı" }, { status: 404 })

  const admin = createAdminClient()
  const { data: doc } = await (admin
    .from("documents") as any)
    .select("id, organization_id, storage_path")
    .eq("id", id)
    .single()

  if (!doc || doc.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: "Sənəd tapılmadı" }, { status: 404 })
  }

  await (admin.storage.from("documents") as any).remove([doc.storage_path])
  await (admin.from("documents") as any).delete().eq("id", id)

  return NextResponse.json({ success: true })
}
