import { createServerSupabaseClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import AppClient from "./app-client";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName: string =
    user.user_metadata?.full_name || user.email || "";

  return (
    <AppClient
      userEmail={user.email ?? ""}
      userId={user.id}
      userName={displayName}
    />
  );
}
