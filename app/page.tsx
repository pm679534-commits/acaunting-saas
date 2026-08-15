import Link from "next/link"
import { ArrowRight, FileText, Zap, Download, Check, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900 text-lg">HesabSənəd</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Necə işləyir</a>
          <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Qiymətlər</a>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Daxil ol</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Pulsuz başla</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative pt-24 pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-white to-white pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 mb-8">
          <Zap className="w-3.5 h-3.5" />
          AI ilə dəstəklənən mühasibat avtomatlaşdırması
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-6">
          Fakturalarınızı{" "}
          <span className="text-primary">saniyələr</span>{" "}
          ərzində emal edin
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Sənədlərinizi yükləyin, süni intellekt məlumatları avtomatik çıxartsın — tarix, məbləğ, satıcı adı, VÖEN.
          Nəticəni yoxlayın və Excel-ə ixrac edin.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild className="px-8">
            <Link href="/signup">
              3 gün pulsuz sınayın
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#how-it-works">Necə işləyir</a>
          </Button>
        </div>
        <p className="mt-4 text-sm text-slate-400">Kredit kartı tələb olunmur</p>

        {/* Mock UI preview */}
        <div className="mt-16 relative max-w-4xl mx-auto">
          <div className="rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/60 overflow-hidden bg-white">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs text-slate-400 font-mono">hesabsenəd.az/dashboard</span>
            </div>
            <div className="p-6 bg-white">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Bu ay", value: "47 sənəd" },
                  { label: "Tamamlandı", value: "43" },
                  { label: "Saxlanılan vaxt", value: "~12 saat" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 grid grid-cols-5 gap-4">
                  {["Fayl adı", "Status", "Satıcı", "Məbləğ", "Tarix"].map((h) => (
                    <span key={h} className="text-xs font-medium text-slate-500">{h}</span>
                  ))}
                </div>
                {[
                  { file: "faktura-001.pdf", status: "Tamamlandı", vendor: "Azərenerji MMC", amount: "1,250.00 ₼", date: "12.08.2026" },
                  { file: "qebz-045.jpg", status: "Tamamlandı", vendor: "BP Azərbaycan", amount: "87.50 ₼", date: "11.08.2026" },
                  { file: "inv-2026.png", status: "Emal olunur", vendor: "—", amount: "—", date: "—" },
                ].map((row, i) => (
                  <div key={i} className="px-4 py-3 grid grid-cols-5 gap-4 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-700 font-medium truncate">{row.file}</span>
                    <span className={`text-xs font-medium ${row.status === "Tamamlandı" ? "text-emerald-600" : "text-blue-600"}`}>{row.status}</span>
                    <span className="text-xs text-slate-600 truncate">{row.vendor}</span>
                    <span className="text-xs text-slate-600 font-mono">{row.amount}</span>
                    <span className="text-xs text-slate-600">{row.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      icon: "📄",
      step: "1",
      title: "Sənədi yükləyin",
      desc: "Faktura və ya qəbzin fotoşəklini və ya PDF faylını sürükleyin. JPG, PNG, PDF formatları dəstəklənir.",
    },
    {
      icon: "🤖",
      step: "2",
      title: "AI avtomatik emal edir",
      desc: "Süni intellekt sənədi oxuyur, tarix, məbləğ, satıcı adı və VÖEN-ni avtomatik müəyyən edir.",
    },
    {
      icon: "📊",
      step: "3",
      title: "Yoxlayın və ixrac edin",
      desc: "Çıxarılmış məlumatları yoxlayın, lazım gəldikdə düzəldin. Bir klikdə Excel faylına ixrac edin.",
    },
  ]

  return (
    <section id="how-it-works" className="py-24 bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Necə işləyir?</h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            3 sadə addımda saatlarca əl işini avtomatlaşdırın
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-slate-200" />
          {steps.map(({ icon, step, title, desc }) => (
            <div key={step} className="relative flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-3xl mb-5 relative z-10">
                {icon}
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  {step}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features = [
    { icon: "⚡", title: "Sürətli emal", desc: "Hər sənəd 15–30 saniyə ərzində emal olunur" },
    { icon: "🎯", title: "Yüksək dəqiqlik", desc: "Süni intellekt ilə 95%+ çıxarma dəqiqliyi" },
    { icon: "🔒", title: "Təhlükəsizlik", desc: "Məlumatlarınız şifrələnmiş şəkildə saxlanılır" },
    { icon: "📋", title: "Excel ixrac", desc: "Standart mühasibat formatında .xlsx faylı" },
    { icon: "✏️", title: "Redaktə imkanı", desc: "Hər hansı sahəni asanlıqla düzəldə bilərsiniz" },
    { icon: "📱", title: "VÖEN tanıma", desc: "Azərbaycan VÖEN formatını avtomatik tanıyır" },
  ]

  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Niyə HesabSənəd?</h2>
          <p className="text-lg text-slate-600">Azərbaycan mühasibat firmaları üçün xüsusi hazırlanmış</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200">
              <div className="text-2xl mb-3">{icon}</div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const plans = [
    {
      id: "starter",
      name: "Başlanğıc",
      price: "29",
      limit: "100",
      features: ["Aylıq 100 sənəd", "Excel export", "E-poçt dəstəyi", "7/24 AI emal"],
      cta: "Başla",
      highlight: false,
    },
    {
      id: "pro",
      name: "Professional",
      price: "79",
      limit: "500",
      features: ["Aylıq 500 sənəd", "Excel export", "Prioritet dəstək", "API çıxışı", "Komandalı iş"],
      cta: "Professional ol",
      highlight: true,
    },
    {
      id: "enterprise",
      name: "Korporativ",
      price: null,
      limit: "Limitsiz",
      features: ["Limitsiz sənəd", "Excel & API export", "Xüsusi inteqrasiya", "SLA zəmanəti", "Fərdi onboarding"],
      cta: "Bizimlə əlaqə",
      link: "https://wa.me/994775250891",
      highlight: false,
    },
  ]

  return (
    <section id="pricing" className="py-24 bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Şəffaf qiymətlər</h2>
          <p className="text-lg text-slate-600">Biznesinizin həcminə uyğun plan seçin</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map(({ name, price, limit, features, cta, highlight, link }) => (
            <div
              key={name}
              className={`rounded-2xl p-8 flex flex-col border-2 transition-all ${
                highlight
                  ? "border-primary bg-primary text-white shadow-xl shadow-primary/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
              }`}
            >
              {highlight && (
                <div className="text-xs font-semibold bg-white/20 text-white rounded-full px-3 py-1 w-fit mb-4">
                  Ən populyar
                </div>
              )}
              <h3 className={`text-xl font-bold mb-1 ${highlight ? "text-white" : "text-slate-900"}`}>{name}</h3>
              <div className="mb-2">
                {price ? (
                  <span className={`text-4xl font-bold ${highlight ? "text-white" : "text-slate-900"}`}>
                    {price} <span className={`text-lg font-normal ${highlight ? "text-white/70" : "text-slate-500"}`}>₼/ay</span>
                  </span>
                ) : (
                  <span className={`text-2xl font-bold ${highlight ? "text-white" : "text-slate-900"}`}>Fərdi qiymət</span>
                )}
              </div>
              <p className={`text-sm mb-6 ${highlight ? "text-white/80" : "text-slate-500"}`}>Aylıq {limit} sənəd</p>
              <ul className="space-y-3 flex-1 mb-8">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className={`w-4 h-4 shrink-0 ${highlight ? "text-white" : "text-emerald-500"}`} />
                    <span className={highlight ? "text-white" : "text-slate-700"}>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={highlight ? "secondary" : "default"}
                className={`w-full ${highlight ? "bg-white text-primary hover:bg-white/90" : ""}`}
              >
                <a href={link || (price ? "/signup" : "mailto:sales@hesabsenəd.az")} target={link ? "_blank" : undefined} rel={link ? "noopener noreferrer" : undefined}>
                  {cta}
                  <ChevronRight className="w-4 h-4" />
                </a>
              </Button>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-slate-500 mt-8">
          Bütün planlarda 3 günlük pulsuz sınaq dövrü daxildir. Kredit kartı tələb olunmur.
        </p>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-24">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-indigo-700 p-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Bugün başlayın
          </h2>
          <p className="text-lg text-indigo-200 mb-8 max-w-xl mx-auto">
            Hər ay saatlarla əl işini aradan qaldırın. 3 gün pulsuz sınayın, heç bir öhdəlik olmadan.
          </p>
          <Button size="lg" variant="secondary" asChild className="px-10">
            <Link href="/signup">
              Pulsuz qeydiyyat
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">HesabSənəd</span>
          </div>
          <nav className="flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Necə işləyir</a>
            <a href="#pricing" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Qiymətlər</a>
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Daxil ol</Link>
          </nav>
          <p className="text-sm text-slate-400">© 2026 HesabSənəd. Bütün hüquqlar qorunur.</p>
        </div>
      </div>
    </footer>
  )
}
