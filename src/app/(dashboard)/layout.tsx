import { syncUserWithClerk } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sync user with Clerk - this will create the user if they don't exist
  const user = await syncUserWithClerk();
  
  if (!user) {
    redirect("/sign-in");
  }

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}