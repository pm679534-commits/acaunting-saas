import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validation/schemas"
import { sanitizeFilename } from "@/lib/utils"
import { randomUUID } from "crypto"

export const runtime = "nodejs"
export const maxDuration = 30
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return NextResponse.json({ error: "Profil tapılmadı" }, { status: 404 })

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const pageSize = Math.min(100, parseInt(url.searchParams.get("pageSize") ?? "20"))
  const status = url.searchParams.get("status")
  const search = url.searchParams.get("search")
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (status) query = query.eq("status", status)
  if (search) {
    query = query.or(
      `original_filename.ilike.%${search}%,raw_extraction->>vendor_name.ilike.%${search}%`
    )
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ documents: data, total: count })
}

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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Forma məlumatları oxunmadı" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Fayl tələb olunur" }, { status: 400 })

  // Validate MIME type from the file object
  if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
    return NextResponse.json({ error: "Yalnız JPG, PNG, WebP, PDF faylları qəbul olunur" }, { status: 400 })
  }

  // Server-side size validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "Fayl ölçüsü 50 MB-dan çox ola bilməz" }, { status: 400 })
  }

  // Read file bytes for content validation
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Basic magic number validation for common file types
  const magicNumbers = buffer.slice(0, 8)
  const isValidContent =
    // JPEG: FF D8 FF
    (magicNumbers[0] === 0xFF && magicNumbers[1] === 0xD8 && magicNumbers[2] === 0xFF) ||
    // PNG: 89 50 4E 47
    (magicNumbers[0] === 0x89 && magicNumbers[1] === 0x50 && magicNumbers[2] === 0x4E && magicNumbers[3] === 0x47) ||
    // WebP: RIFF...WEBP
    (magicNumbers[0] === 0x52 && magicNumbers[1] === 0x49 && magicNumbers[2] === 0x46 && magicNumbers[3] === 0x46) ||
    // PDF: %PDF
    (magicNumbers[0] === 0x25 && magicNumbers[1] === 0x50 && magicNumbers[2] === 0x44 && magicNumbers[3] === 0x46)

  if (!isValidContent) {
    return NextResponse.json({ error: "Fayl məzmunu etibarsızdır" }, { status: 400 })
  }

  // Sanitize filename and create random UUID-prefixed path to prevent collisions and path traversal
  const sanitized = sanitizeFilename(file.name)
  const storagePath = `${profile.organization_id}/${randomUUID()}-${sanitized}`

  const admin = createAdminClient()
  const { error: uploadError } = await (admin.storage
    .from("documents") as any)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `Storage xətası: ${uploadError.message}` }, { status: 500 })
  }

  const { data: doc, error: dbError } = await (admin
    .from("documents") as any)
    .insert({
      organization_id: profile.organization_id,
      uploaded_by: user.id,
      storage_path: storagePath,
      original_filename: file.name.slice(0, 255),
      file_type: file.type,
      file_size_bytes: file.size,
      status: "pending",
    })
    .select("id")
    .single()

  if (dbError) {
    await (admin.storage.from("documents") as any).remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ id: doc.id }, { status: 201 })
}
