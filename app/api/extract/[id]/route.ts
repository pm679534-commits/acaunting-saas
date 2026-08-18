import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAIProvider } from "@/lib/ai"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, organizations(preferred_model)")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Profil tapılmadı" }, { status: 404 })
  }

  const orgData = profile.organizations as unknown as { preferred_model: string } | null
  const preferredModel = orgData?.preferred_model ?? "gemini-2.5-flash-latest"

  // Rate limit: 20 extractions per minute per org
  const { allowed } = await checkRateLimit(
    `extract:${profile.organization_id}`,
    20
  )
  if (!allowed) {
    return NextResponse.json(
      { error: "Çox sayda sorğu. Bir dəqiqə gözləyin." },
      { status: 429 }
    )
  }

  const admin = createAdminClient()

  // Atomic check-and-set to prevent race condition: only update if status is NOT already processing
  const { data: updateResult } = await (admin
    .from("documents") as any)
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .neq("status", "processing")  // Only proceed if NOT already processing
    .select("id, storage_path, file_type, status")
    .single()

  if (!updateResult) {
    return NextResponse.json({ error: "Sənəd artıq emal olunur və ya tapılmadı" }, { status: 409 })
  }

  const doc = updateResult

  try {
    // Get signed URL and download file
    const { data: signedData, error: signError } = await (admin.storage
      .from("documents") as any)
      .createSignedUrl(doc.storage_path, 120)

    if (signError || !signedData?.signedUrl) {
      throw new Error(`Fayla giriş mümkün olmadı: ${signError?.message}`)
    }

    const fileRes = await fetch(signedData.signedUrl)
    if (!fileRes.ok) throw new Error("Fayl yüklənmədi")
    const arrayBuffer = await fileRes.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Extract with AI using organization's preferred model
    const provider = getAIProvider()
    const extraction = await provider.extractFromDocument(fileBuffer, doc.file_type, preferredModel)

    // Save extraction result
    await (admin
      .from("documents") as any)
      .update({
        status: "done",
        raw_extraction: extraction,
        extracted_at: new Date().toISOString(),
        extraction_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    // If extraction contains line items, save them to the line_items table
    if (extraction.line_items && extraction.line_items.length > 0) {
      // First, delete any existing line items for this document (in case of retry/reprocessing)
      await (admin.from("document_line_items") as any).delete().eq("document_id", id)

      const lineItemsToInsert = extraction.line_items.map((item, index) => ({
        document_id: id,
        line_number: index + 1,
        description: item.description,
        amount: item.amount,
        currency: item.currency || extraction.currency,
        date: item.date || extraction.date,
        category: item.category,
      }))

      await (admin.from("document_line_items") as any).insert(lineItemsToInsert)
    }

    // Log usage
    const { data: subscription } = await (admin
      .from("subscriptions") as any)
      .select("current_period_start")
      .eq("organization_id", profile.organization_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    await (admin.from("usage_logs") as any).insert({
      organization_id: profile.organization_id,
      document_id: id,
      billing_period_start: subscription?.current_period_start ?? new Date().toISOString(),
    })

    return NextResponse.json({ success: true, extraction })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinməyən xəta"
    await (admin
      .from("documents") as any)
      .update({
        status: "error",
        extraction_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
