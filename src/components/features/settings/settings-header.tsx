import { Settings } from "lucide-react";

export function SettingsHeader() {
  return (
    <div className="flex items-center space-x-3">
      <Settings className="h-8 w-8 text-light-text-primary dark:text-dark-text-primary" />
      <div>
        <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
          Settings
        </h1>
      </div>
    </div>
  );
}