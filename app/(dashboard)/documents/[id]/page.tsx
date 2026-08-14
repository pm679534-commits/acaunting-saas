import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/layout/page-header"
import { ReviewTable } from "@/components/document/review-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

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

  if (!profile?.organization_id) redirect("/login")

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single()

  if (!doc) notFound()

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="text-slate-500 -ml-2">
          <Link href="/dashboard">
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
