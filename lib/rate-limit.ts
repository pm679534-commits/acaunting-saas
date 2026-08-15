import { createAdminClient } from "@/lib/supabase/admin";

const WINDOW_SECONDS = 60;

export async function checkRateLimit(
  key: string,
  limit: number
): Promise<{ allowed: boolean; remaining: number }> {
  const admin = createAdminClient();
  const now = new Date();

  const { data, error } = await (admin
    .from("rate_limit_windows") as any)
    .select("count, window_start")
    .eq("key", key)
    .single();

  if (error && error.code !== "PGRST116") {
    // On DB error, fail open — don't block legitimate requests
    return { allowed: true, remaining: limit };
  }

  const windowStart = data?.window_start ? new Date(data.window_start) : null;
  const windowExpired =
    !windowStart ||
    now.getTime() - windowStart.getTime() > WINDOW_SECONDS * 1000;

  if (windowExpired) {
    await (admin.from("rate_limit_windows") as any).upsert({
      key,
      count: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true, remaining: limit - 1 };
  }

  const currentCount = data?.count ?? 0;
  if (currentCount >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await (admin
    .from("rate_limit_windows") as any)
    .update({ count: currentCount + 1 })
    .eq("key", key);

  return { allowed: true, remaining: limit - currentCount - 1 };
}
