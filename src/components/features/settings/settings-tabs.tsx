import { Card } from "@/components/ui/card";
import { User } from "@prisma/client";

interface SettingsTabsProps {
  user: User;
}

export function SettingsTabs({ user }: SettingsTabsProps) {
  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
          Account Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              Name
            </label>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              {user.name || "Not set"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              Email
            </label>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              {user.email}
            </p>
          </div>
        </div>
      </Card>

      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
          Preferences
        </h3>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          Settings options coming soon...
        </p>
      </Card>
    </div>
  );
}