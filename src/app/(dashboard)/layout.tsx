import { createServerSupabaseClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import DashboardProvider from "@/app/(dashboard)/dashboard-provider";
import DashboardLayoutUI from "@/app/(dashboard)/dashboard-layout-ui";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName: string =
    user.user_metadata?.full_name || user.email || "";

  return (
    <DashboardProvider
      userId={user.id}
      userEmail={user.email ?? ""}
      userName={displayName}
    >
      <DashboardLayoutUI>
        {children}
      </DashboardLayoutUI>
    </DashboardProvider>
  );
}
