"use client"

import { useState } from "react"
import { Check, Loader2, Building2, Mail, CreditCard, Calendar, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/lib/hooks/use-toast"
import { formatDate } from "@/lib/utils"
import { ALLOWED_MODELS } from "@/lib/ai/models"

interface Plan {
  id: string
  name: string
  price_azn: number
  document_limit: number
  features: string[]
}

interface BillingSectionProps {
  currentPlan: Record<string, unknown> | null
  subscriptionStatus: string
  periodEnd: string
  usageCount: number
  allPlans: Plan[]
  orgName: string
  userEmail: string
  preferredModel: string
  userRole: string
}

export function BillingSection({
  currentPlan,
  subscriptionStatus,
  periodEnd,
  usageCount,
  allPlans,
  orgName,
  userEmail,
  preferredModel,
  userRole,
}: BillingSectionProps) {
  const { toast } = useToast()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(preferredModel)
  const [updatingModel, setUpdatingModel] = useState(false)

  const canEditSettings = userRole === "owner" || userRole === "admin"

  const planId = currentPlan?.id as string | undefined
  const planLimit = (currentPlan?.document_limit as number) ?? 5
  const isUnlimited = planLimit >= 9999
  const usagePct = isUnlimited ? 0 : Math.min(100, Math.round((usageCount / planLimit) * 100))

  async function handleUpgrade(targetPlanId: string) {
    setLoadingPlan(targetPlanId)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: targetPlanId }),
      })
      if (!res.ok) throw new Error("Ödəniş sessiyası yaradılmadı")
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      toast({
        title: "Xəta",
        description: err instanceof Error ? err.message : "Xəta baş verdi",
        variant: "destructive",
      })
    } finally {
      setLoadingPlan(null)
    }
  }

  async function handleModelChange(newModel: string) {
    if (!canEditSettings) {
      toast({
        title: "İcazə yoxdur",
        description: "Bu parametri dəyişmək üçün icazəniz yoxdur",
        variant: "destructive",
      })
      return
    }

    setUpdatingModel(true)
    try {
      const res = await fetch("/api/settings/model", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: newModel }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Model yenilənmədi")
      }
      setSelectedModel(newModel)
      toast({
        title: "Uğurlu",
        description: "Model seçimi yeniləndi",
      })
    } catch (err) {
      toast({
        title: "Xəta",
        description: err instanceof Error ? err.message : "Xəta baş verdi",
        variant: "destructive",
      })
    } finally {
      setUpdatingModel(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hesab məlumatları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Şirkət</p>
              <p className="text-sm font-medium text-slate-900">{orgName}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">E-poçt</p>
              <p className="text-sm font-medium text-slate-900">{userEmail}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Model selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sənəd emalı modeli</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-slate-400 mt-1" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Sənədlərin avtomatik emalı üçün istifadə olunan model
                </p>
                <Select
                  value={selectedModel}
                  onValueChange={handleModelChange}
                  disabled={!canEditSettings || updatingModel}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ALLOWED_MODELS).map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!canEditSettings && (
                <p className="text-xs text-amber-600">
                  Yalnız sahiblər və administratorlar bu parametri dəyişə bilər
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current plan + usage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Cari plan</CardTitle>
            <Badge variant={subscriptionStatus === "active" ? "success" : "warning"}>
              {subscriptionStatus === "active" ? "Aktiv" : subscriptionStatus === "trialing" ? "Sınaq" : subscriptionStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Plan</p>
              <p className="text-sm font-medium text-slate-900">
                {(currentPlan?.name as string) ?? "Başlanğıc"}
                {" · "}
                {currentPlan == null
                  ? "—"
                  : (currentPlan.price_azn as number) === 0
                  ? "Fərdi qiymət"
                  : `${currentPlan.price_azn as number} ₼/ay`}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Növbəti ödəniş</p>
              <p className="text-sm font-medium text-slate-900">{formatDate(periodEnd)}</p>
            </div>
          </div>
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">Bu ay istifadə</p>
              <p className="text-sm font-semibold text-slate-900">
                {usageCount} / {isUnlimited ? "Limitsiz" : `${planLimit} sənəd`}
              </p>
            </div>
            <Progress value={usagePct} className={usagePct >= 80 ? "[&>div]:bg-amber-500" : ""} />
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Planlar</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allPlans.map((plan) => {
            const isCurrent = plan.id === planId
            const features = Array.isArray(plan.features) ? plan.features : JSON.parse(String(plan.features ?? "[]"))
            return (
              <div
                key={plan.id}
                className={`rounded-xl border-2 p-5 sm:p-6 flex flex-col transition-all ${
                  isCurrent
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                    {isCurrent && <Badge variant="default" className="text-[10px]">Cari</Badge>}
                  </div>
                  <p className="text-2xl font-bold text-slate-900 mt-2">
                    {plan.price_azn === 0 ? (
                      <span className="text-lg">Fərdi qiymət</span>
                    ) : (
                      <>
                        {plan.price_azn} <span className="text-base font-normal text-slate-500">₼/ay</span>
                      </>
                    )}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Aylıq {plan.document_limit >= 9999 ? "limitsiz" : plan.document_limit} sənəd</p>
                </div>
                <ul className="space-y-2 flex-1 mb-5">
                  {features.map((f: string) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">Aktiv plan</Button>
                ) : plan.price_azn === 0 ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href="https://wa.me/994775250891" target="_blank" rel="noopener noreferrer">Bizimlə əlaqə</a>
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === plan.id && <Loader2 className="animate-spin" />}
                    {plan.price_azn > (currentPlan?.price_azn as number ?? 0) ? "Yüksəlt" : "Keç"}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
