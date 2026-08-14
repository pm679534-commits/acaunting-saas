import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkoutSchema } from "@/lib/validation/schemas"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Yanlış JSON" }, { status: 400 })
  }

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { planId } = parsed.data

  // Billing stub — replace with Payriff/EPoint/Stripe SDK when credentials are available
  const sessionUrl = await createCheckoutSession(planId, user.id)

  return NextResponse.json({ url: sessionUrl })
}

async function createCheckoutSession(planId: string, _userId: string): Promise<string> {
  // TODO: Replace with real payment provider integration (Payriff, EPoint, or Stripe)
  // Example Stripe:
  //   const session = await stripe.checkout.sessions.create({
  //     mode: "subscription",
  //     line_items: [{ price: PRICE_IDS[planId], quantity: 1 }],
  //     success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?checkout=success`,
  //     cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  //   })
  //   return session.url!
  console.log(`[billing] checkout requested for plan: ${planId}`)
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/settings?checkout=pending&plan=${planId}`
}
