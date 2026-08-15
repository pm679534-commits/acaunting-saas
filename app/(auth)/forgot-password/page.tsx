"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { FileText } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-slate-900 text-xl">HesabSənəd</span>
            </Link>
          </div>

          <Card className="shadow-lg border-slate-200">
            <CardHeader className="pb-4 text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl">E-poçt göndərildi</CardTitle>
              <CardDescription>
                Əgər hesabınız varsa, şifrə sıfırlama linki e-poçt ünvanınıza göndərilib.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 text-center">
                E-poçt qutunuzu yoxlayın və linki izləyərək yeni şifrə təyin edin.
                Link 1 saat ərzində etibarlıdır.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">
                  <ArrowLeft className="w-4 h-4" />
                  Girişə qayıt
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-xl">HesabSənəd</span>
          </Link>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Şifrəni unutdunuz?</CardTitle>
            <CardDescription>
              E-poçt ünvanınızı daxil edin, şifrə sıfırlama linki göndərək.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-poçt</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="siz@hesabmmc.az"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-10"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Göndərilir..." : "Şifrə sıfırlama linki göndər"}
              </Button>

              <Button variant="ghost" className="w-full" asChild>
                <Link href="/login">
                  <ArrowLeft className="w-4 h-4" />
                  Girişə qayıt
                </Link>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
