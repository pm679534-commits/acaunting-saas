"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

interface AuthFormProps {
  mode: "login" | "signup"
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })

        if (signUpError) throw signUpError
        if (!data.user) throw new Error("İstifadəçi yaradılmadı")

        const res = await fetch("/api/auth/setup-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, orgName, userId: data.user.id }),
        })

        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error ?? "Profil qurulmadı")
        }

        router.push("/dashboard")
        router.refresh()
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi")
    } finally {
      setLoading(false)
    }
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
            <CardTitle className="text-2xl">
              {mode === "login" ? "Daxil olun" : "Qeydiyyat"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Hesabınıza daxil olmaq üçün məlumatlarınızı daxil edin"
                : "Hesabınızı yaradın və mühasibatı avtomatlaşdırın"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Ad Soyad</Label>
                    <Input
                      id="fullName"
                      placeholder="Əli Həsənov"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Şirkət adı</Label>
                    <Input
                      id="orgName"
                      placeholder="Hesab MMC"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-poçt</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="siz@hesabmmc.az"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Şifrə</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
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

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {mode === "login" ? "Daxil ol" : "Hesab yarat"}
              </Button>

              <p className="text-sm text-center text-slate-500">
                {mode === "login" ? (
                  <>
                    Hesabınız yoxdur?{" "}
                    <Link href="/signup" className="text-primary font-medium hover:underline">
                      Qeydiyyat
                    </Link>
                  </>
                ) : (
                  <>
                    Hesabınız var?{" "}
                    <Link href="/login" className="text-primary font-medium hover:underline">
                      Daxil olun
                    </Link>
                  </>
                )}
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
