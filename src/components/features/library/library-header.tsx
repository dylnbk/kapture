import { Button } from "@/components/ui/button";
import { Library, Search, Filter } from "lucide-react";
import { UploadDialog } from "./upload-dialog";

interface LibraryHeaderProps {
  onUploadComplete?: () => void;
}

export function LibraryHeader({ onUploadComplete }: LibraryHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center space-x-3">
        <Library className="h-8 w-8 text-light-text-primary dark:text-dark-text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Library
          </h1>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <UploadDialog onUploadComplete={onUploadComplete} />
      </div>
    </div>
  );
}