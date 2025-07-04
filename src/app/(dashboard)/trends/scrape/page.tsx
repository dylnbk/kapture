import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TrendsScrapeForm } from "@/components/features/trends/trends-scrape-form";

export default async function TrendsScrapePage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Scraper</h1>
          <p className="text-muted-foreground">
            By default we scrape popular social media platforms such as Instagram, TikTok, Facebook, X, and Reddit for content related to your keywords and hashtags. You can also provide custom URLs, posts and profiles to be included.
          </p>
        </div>
        
        <TrendsScrapeForm />
      </div>
    </div>
  );
}