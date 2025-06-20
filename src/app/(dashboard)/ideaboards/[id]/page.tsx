import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { IdeaboardView } from "@/components/features/ideaboards/ideaboard-view";

interface IdeaboardPageProps {
  params: {
    id: string;
  };
}

async function getIdeaboard(id: string, userId: string) {
  try {
    const ideaboard = await db.ideaboard.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        contentIdeas: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });

    return ideaboard;
  } catch (error) {
    console.error('Error fetching ideaboard:', error);
    return null;
  }
}

export default async function IdeaboardPage({ params }: IdeaboardPageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const ideaboard = await getIdeaboard(params.id, user.id);

  if (!ideaboard) {
    notFound();
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <IdeaboardView ideaboard={ideaboard} />
    </div>
  );
}