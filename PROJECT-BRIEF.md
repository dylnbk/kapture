# Kapture – AI-Powered Trend & Content Engine for Creators

## 🧾 Project Brief

**Kapture** is a web platform that helps content creators stay ahead of trends and consistently generate platform-optimized content. It scrapes data from top social platforms, downloads real media assets, and uses AI to transform them into ideas, hooks, scripts, and full content pieces for Shorts, Reels, and long-form video.

The system is designed for resilience, ease of use, and a streamlined hosting setup — with a focus on stability, cost-efficiency, and compliance.

---

## 🧠 Core Mission

Enable creators to go from **trend → idea → media** in one platform:
- 🔎 Discover emerging content in chosen niches
- 📥 Grab video/audio/media from platforms directly
- 🧠 Use AI to script, plan, and refine high-impact posts
- 🗂️ Manage a personal content vault for ideation and reuse

---

## 🔑 Core Features

### 1. 🚀 Dashboard
- Personalized view of trends, ideaboards, usage quotas
- Quick access to scraping, downloads, and AI tools
- Tracks active plan and limits

### 2. 🔍 Trend Scraping
- Powered by **Apify Actors**
- Scheduled or manual scrapes across:
  - YouTube Shorts
  - TikTok (hashtags/profiles)
  - Reddit (subreddits/threads)
  - Twitter/X (threads/hashtags)
- Returns content metadata (title, text, link, likes, etc.)

### 3. 📥 Media Downloader
- Powered by **yt-dlp**, deployed via **Fly.io**
- Supports YouTube, TikTok, Instagram Reels, Reddit, Twitter
- Proxies and retry logic ensure resistance to blocking
- Media files uploaded to **Cloudflare R2**
- Usage rate-limited by plan tier

### 4. 💡 Ideaboards
- Rich text + AI-assisted workspace
- Generate ideas, titles, hooks, scripts, descriptions, hashtags
- Modes: manual, assisted, fully AI
- Tag and organize ideas by campaign or channel

### 5. 📚 Content Library
- Index of all scraped/downloaded/uploaded content
- Search, filter, and reuse content in ideaboards
- Displays thumbnails, captions, and related metadata

---

## 🎨 Aesthetic
Minimalist, modern & clean design using monochrome dark/lightmode and Glassmorphism cards
- **Minimalist**: Minimalist first principles, no clutter, simple cards
- **Unified icons**: Lucide dev icons
- **Dark/Lightmode**: Monochromatic, but offering dark/lightmode toggle
- **Glassmorphism**: All cards and elements are glass design, blur & transparent, modern
- **three.js**: We will have a subtle but interactive three.js background (this will be implmented at a later point)
- **Darkmode**: 
[
  { "color": "#121212", "purpose": "Base Background" },
  { "color": "#E0E0E0", "purpose": "Primary Text" },
  { "color": "#B0B0B0", "purpose": "Secondary Text/Subtle Elements" },
  { "color": "#FFFFFF", "purpose": "Accent/Interactive Elements" },
  { "color": "#00EB9B", "purpose": "Success/Positive" },
  { "color": "#E70063", "purpose": "Error/Negative" },
  { "color": "#878787", "purpose": "Borders/Dividers" }
]
- **Lightmode**: 
[
  { "color": "#F2F0EF", "purpose": "Base Background" },
  { "color": "#2C2C2C", "purpose": "Primary Text" },
  { "color": "#5F5F5F", "purpose": "Secondary Text/Subtle Elements" },
  { "color": "#000000", "purpose": "Accent/Interactive Elements" },
  { "color": "#00EB9B", "purpose": "Success/Positive" },
  { "color": "#E70063", "purpose": "Error/Negative" },
  { "color": "#878787", "purpose": "Borders/Dividers" }
]

---

## 🧩 Integrations & Infrastructure

| Component       | Tool/Service           | Hosting            |
|-----------------|------------------------|---------------------|
| Frontend & API  | **Next.js (App Router)**| Render              |
| Database        | **PostgreSQL**         | Render              |
| Authentication | **Clerk**               | External            |
| Billing         | **Stripe**             | External            |
| Scraping Engine | **Apify Actors**       | External            |
| Media Downloads | **yt-dlp + Proxy**     | Fly.io              |
| File Storage    | **Cloudflare R2**      | External (S3-style) |

---

## 🔐 Auth & Payments

### Clerk
- Handles user login/signup (email, social)
- Stores metadata: plan tier, quotas, usage
- Auth SDK used in frontend/backend for gated access

***These keys are real. They are NOT placeholders and are ready to use.***
`
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y29vbC1wYW5kYS0yNy5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_j3h7VZMHw1jDNMb4vHav9Gb7ZaetMhTGGgO3OTIBJf
`
- See `.clerk-setup` for instructions on Clerk implementation

### Stripe
- Checkout + billing portal for subscriptions
- Webhooks sync with Clerk & DB to update plan/usage
- Free, Pro, and Studio plans with increasing limits
- See `.strip-rules` for instructions on Strip implementation 

---

## 💳 Pricing Model

| Plan     | Price      | Includes                                             |
|----------|------------|------------------------------------------------------|
| Free     | $0/mo      | 10 scrapes, 3 downloads, 5 AI generations, 1 board   |
| Pro      | $29/mo     | 100 scrapes, 50 downloads, unlimited AI, scheduling  |
| Studio   | $99/mo     | 500 scrapes, 200 downloads, premium proxy pool       |

Plan usage tracked via DB + Clerk metadata.

---

## 🛠️ Technical Stack Summary

- **Frontend & API**: Next.js (App Router), deployed on Render
- **Backend**: API routes or tRPC in same app, handles scraper triggers, AI calls, usage tracking
- **Database**: PostgreSQL via Render
- **Auth**: Clerk (social login, plan metadata)
- **Billing**: Stripe (webhooks trigger DB + Clerk updates)
- **Scraping**: Apify actors, paid via usage-based plan
- **Media**: yt-dlp worker (Fly.io) with rotating proxies → Cloudflare R2
- **AI Generation**: OpenAI API (or similar), context-aware scripting

---

## 🌱 MVP Scope

- ✅ User auth and plans via Clerk + Stripe
- ✅ Scraping via Apify with scheduler + keyword targeting
- ✅ Media downloader with proxy support via yt-dlp on Fly.io
- ✅ AI-powered ideation interface (titles, scripts, hooks)
- ✅ Content library and ideaboards
- ✅ Quota enforcement and plan upgrades

---

## 📈 Future Features

- Chrome extension to capture trends in-browser
- Team collaboration (shared ideaboards, editors)
- Integration with posting tools (YouTube, Meta, TikTok)
- Analytics: best-performing content types by niche
- Custom AI finetuning per user (style/voice memory)

---

## 🎯 Goal

Deliver an intuitive, all-in-one tool for creators to discover trends, grab content, and turn it into high-quality ideas with minimal effort and no creative blocks — at scale.