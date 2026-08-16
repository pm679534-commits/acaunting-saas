import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateModel } from "@/lib/ai/models";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Profil tapılmadı" }, { status: 404 });
  }

  // Only owner/admin can change settings
  if (profile.role !== "owner" && profile.role !== "admin") {
    return NextResponse.json(
      { error: "Bu əməliyyat üçün icazəniz yoxdur" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { model } = body;

  if (!model || typeof model !== "string") {
    return NextResponse.json({ error: "Model seçilməlidir" }, { status: 400 });
  }

  try {
    // Validate against allowlist
    const validatedModel = validateModel(model);

    // Update organization's preferred model
    const admin = createAdminClient();
    const { error } = await (admin.from("organizations") as any)
      .update({ preferred_model: validatedModel })
      .eq("id", profile.organization_id);

    if (error) {
      console.error("Failed to update preferred_model:", error);
      return NextResponse.json(
        { error: "Model yenilənmədi" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinməyən xəta";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
