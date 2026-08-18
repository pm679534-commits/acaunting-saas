import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { exportDocumentsSchema } from "@/lib/validation/schemas"
import { generate1CXml } from "@/lib/xml/export-1c"

export const runtime = "nodejs"
export const maxDuration = 30
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
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
    body = {}
  }

  const parsed = exportDocumentsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const admin = createAdminClient()

  let query = (admin
    .from("documents") as any)
    .select("id, original_filename, raw_extraction, edited_fields, created_at, document_line_items(line_number, description, amount, currency, date, category, quantity, unit)")
    .eq("organization_id", profile.organization_id)
    .eq("status", "done")
    .order("created_at", { ascending: false })

  if (parsed.data.documentIds && parsed.data.documentIds.length > 0) {
    query = query.in("id", parsed.data.documentIds)
  }

  const { data: documents, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!documents || documents.length === 0) {
    return NextResponse.json({ error: "Export üçün sənəd tapılmadı" }, { status: 404 })
  }

  const xml = generate1CXml(documents)
  const buffer = Buffer.from(xml, "utf-8")

  const filename = `1c-senedler-${new Date().toISOString().split("T")[0]}.xml`

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  })
}
