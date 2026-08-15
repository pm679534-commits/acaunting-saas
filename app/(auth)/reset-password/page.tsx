"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, CheckCircle2, AlertCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validSession, setValidSession] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if we have a valid recovery session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        setValidSession(false)
      } else {
        setValidSession(true)
      }
    })
  }, [supabase.auth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Şifrələr uyğun gəlmir")
      return
    }

    if (password.length < 8) {
      setError("Şifrə ən azı 8 simvol olmalıdır")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şifrə yenilənmədi")
    } finally {
      setLoading(false)
    }
  }

  if (validSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-slate-600">Yüklənir...</p>
        </div>
      </div>
    )
  }

  if (validSession === false) {
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
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Etibarsız link</CardTitle>
              <CardDescription>
                Bu şifrə sıfırlama linki artıq etibarsızdır və ya vaxtı keçib.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 text-center">
                Şifrə sıfırlama linkləri 1 saat ərzində etibarlıdır. Yeni link tələb edin.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" asChild>
                <Link href="/forgot-password">Yeni link tələb et</Link>
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/login">Girişə qayıt</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  if (success) {
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
              <CardTitle className="text-2xl">Şifrə yeniləndi</CardTitle>
              <CardDescription>
                Şifrəniz uğurla dəyişdirildi. Giriş səhifəsinə yönləndirilirsiniz...
              </CardDescription>
            </CardHeader>
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
            <CardTitle className="text-2xl">Yeni şifrə təyin edin</CardTitle>
            <CardDescription>
              Hesabınız üçün yeni şifrə daxil edin.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Yeni şifrə</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Şifrəni təsdiq edin</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2">
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Yenilənir..." : "Şifrəni yenilə"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
