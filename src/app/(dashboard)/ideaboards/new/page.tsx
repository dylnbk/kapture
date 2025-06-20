import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IdeaboardCreateForm } from "@/components/features/ideaboards/ideaboard-create-form";

export default async function NewIdeaboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Ideaboard</h1>
          <p className="text-muted-foreground">
            Set up your AI-powered ideaboard to generate creative content ideas.
          </p>
        </div>
        
        <IdeaboardCreateForm />
      </div>
    </div>
  );
}