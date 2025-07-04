import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-light-base to-gray-100 dark:from-dark-base dark:to-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            Join Kapture
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Start creating content from trends today
          </p>
        </div>
        
        <div className="kapture-glass dark:kapture-glass-dark rounded-xl p-6">
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary: 
                  "bg-light-accent dark:bg-dark-accent text-light-base dark:text-dark-base hover:opacity-90",
                card: "bg-transparent shadow-none",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
              },
            }}
            redirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}