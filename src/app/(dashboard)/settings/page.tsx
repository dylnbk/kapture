import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsHeader } from "@/components/features/settings/settings-header";
import { SettingsTabs } from "@/components/features/settings/settings-tabs";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <SettingsHeader />
      <SettingsTabs user={user} />
    </div>
  );
}