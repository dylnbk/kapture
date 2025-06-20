import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

export default async function HomePage() {
  const user = await currentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-base to-gray-100 dark:from-dark-base dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6">
            Kapture
          </h1>
          <p className="text-xl text-light-text-secondary dark:text-dark-text-secondary mb-8 max-w-2xl mx-auto">
            AI-Powered Trend & Content Engine for Creators
          </p>
          <p className="text-lg text-light-text-secondary dark:text-dark-text-secondary mb-12 max-w-3xl mx-auto">
            Discover emerging content, download media assets, and transform them into 
            high-impact posts with AI assistance. Go from trend to idea to media in one platform.
          </p>
          
          <div className="flex gap-4 justify-center">
            <a
              href="/sign-up"
              className="px-8 py-3 bg-light-accent dark:bg-dark-accent text-light-base dark:text-dark-base rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Get Started
            </a>
            <a
              href="/sign-in"
              className="px-8 py-3 border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary rounded-lg font-semibold hover:bg-light-text-primary/5 dark:hover:bg-dark-text-primary/5 transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="kapture-glass dark:kapture-glass-dark rounded-xl p-6">
            <h3 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
              🔍 Trend Discovery
            </h3>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Scrape trending content from YouTube, TikTok, Reddit, and Twitter with automated scheduling.
            </p>
          </div>
          
          <div className="kapture-glass dark:kapture-glass-dark rounded-xl p-6">
            <h3 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
              📥 Media Downloads
            </h3>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Download videos, audio, and images with proxy support and cloud storage integration.
            </p>
          </div>
          
          <div className="kapture-glass dark:kapture-glass-dark rounded-xl p-6">
            <h3 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
              💡 AI Ideation
            </h3>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Generate titles, hooks, scripts, and descriptions with AI-powered content creation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}