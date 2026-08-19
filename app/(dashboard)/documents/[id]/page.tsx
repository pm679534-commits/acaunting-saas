import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/layout/page-header"
import { ReviewTable } from "@/components/document/review-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: doc } = await supabase
    .from("documents")
    .select("*, document_line_items(line_number, description, amount, currency, date, category, quantity, unit)")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single()

  if (!doc) notFound()

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="text-slate-500 -ml-2">
          <Link href="/dashboard" prefetch={true}>
            <ArrowLeft className="w-4 h-4" />
            Geri qayıt
          </Link>
        </Button>
      </div>
      <PageHeader
        title={doc.original_filename}
        description="Çıxarılmış məlumatları yoxlayın və lazım gəldikdə düzəldin"
      />
      <ReviewTable document={doc} />
    </div>
  )
}
