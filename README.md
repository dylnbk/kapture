# Kapture - AI-Powered Trend & Content Engine

Kapture is a web platform that helps content creators stay ahead of trends and consistently generate platform-optimized content. It scrapes data from top social platforms, downloads real media assets, and uses AI to transform them into ideas, hooks, scripts, and full content pieces.

## 🚀 Features

- **🔍 Trend Discovery**: Scrape trending content from YouTube, TikTok, Reddit, and Twitter
- **📥 Media Downloads**: Download videos, audio, and images with proxy support
- **💡 AI Ideation**: Generate titles, hooks, scripts, and descriptions with AI assistance
- **📚 Content Library**: Organize and search through all your scraped content
- **🎨 Glassmorphism Design**: Modern, clean interface with dark/light mode support

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Payments**: Stripe
- **Styling**: Tailwind CSS with glassmorphism design
- **AI**: OpenAI API
- **Storage**: Cloudflare R2
- **Scraping**: Apify Actors
- **Media Processing**: yt-dlp

## 🏗️ Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Clerk account
- Stripe account (for payments)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd kapture
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your environment variables in `.env.local`:
- Database connection string
- Clerk authentication keys (provided in PROJECT-BRIEF.md)
- Stripe keys
- OpenAI API key
- Other service keys as needed

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
kapture/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/         # Authentication pages
│   │   ├── (dashboard)/    # Dashboard pages
│   │   └── api/            # API routes
│   ├── components/         # React components
│   │   ├── ui/            # Reusable UI components
│   │   ├── layout/        # Layout components
│   │   ├── features/      # Feature-specific components
│   │   └── shared/        # Shared components
│   ├── lib/               # Utility libraries
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript type definitions
├── prisma/                # Database schema and migrations
└── public/                # Static assets
```

## 🎨 Design System

The application uses a glassmorphism design system with:

- **Dark Mode Colors**:
  - Base: `#121212`
  - Primary Text: `#E0E0E0`
  - Secondary Text: `#B0B0B0`
  - Accent: `#FFFFFF`
  - Success: `#00EB9B`
  - Error: `#E70063`

- **Light Mode Colors**:
  - Base: `#F2F0EF`
  - Primary Text: `#2C2C2C`
  - Secondary Text: `#5F5F5F`
  - Accent: `#000000`
  - Success: `#00EB9B`
  - Error: `#E70063`

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio
- `npm run db:migrate` - Run database migrations

## 📚 Documentation

- [Technical Architecture](./TECHNICAL-ARCHITECTURE.md)
- [Project Brief](./PROJECT-BRIEF.md)
- [API Documentation](./docs/api-documentation.md)
- [Deployment Guide](./docs/deployment-guide.md)

## 🚦 Development Status

This is the foundational setup with:
- ✅ Next.js project structure
- ✅ Database schema
- ✅ Clerk authentication
- ✅ Basic UI components
- ✅ Dashboard layout
- ✅ API routes structure
- ⏳ Feature implementation (in progress)

## 📄 License

This project is proprietary and confidential.