# Dil Se Catering • Enterprise Autonomous Operations Platform

[![NestJS](https://img.shields.io/badge/Backend-NestJS%2012-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20+%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![LangGraph](https://img.shields.io/badge/Agent-LangGraph-blue)](https://langchain.com/)
[![License](https://img.shields.io/badge/License-Proprietary-gold)]()

Autonomous, multi-modal catering intelligence platform engineered for luxury British-Indian royal banquets, corporate dining, and wedding feasts across the Greater London & South-East UK corridor.

---

## 🌟 Key Capabilities

* **Autonomous LangGraph Hospitality Agent**: Multi-turn WhatsApp concierge handling guest qualifications, event date routing, dynamic package configurations, and customer intent parsing.
* **Multimodal Voice Note Ingestion**: Ingests and transcribes WhatsApp voice notes (`audio/ogg; codecs=opus`) across Hindi, Gujarati, Punjabi, and Hinglish via Gemini 2.5 Flash and Whisper.
* **Host-Protection Radar**: Automatically audits orders to protect host reputations against "stealth meat-eaters," inadequate vegetarian buffers, and dietary cross-contamination.
* **Deterministic Billing Engine**: 100% deterministic pricing with tiered per-head discounts, mileage dispatch surcharges, and guest minimum checks.
* **Real-time Operations Cockpit**: Single-pane enterprise dashboard with Server-Sent Events (SSE) push updates, interactive LangGraph Thought Inspector, Kitchen Prep Sheets, and Concierge Escalation queues.

---

## 🏗️ Architecture

```
Catering/
├── docs/                             # System Architecture & Design System Specs
│   ├── ARCHITECTURE.md               # Architectural Blueprint & Subsystems
│   ├── DESIGN_SYSTEM.md              # Warm Regal Editorial Minimalist tokens
│   └── PLAN.md                       # Roadmap & Engineering Milestones
├── frontend/                         # Vite + React 19 Enterprise Cockpit (Vercel)
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/                # Cockpit Views, Modals & Barrel Exports
│   │   │   └── common/               # Shared Reusable Elements (RoyalCrest)
│   │   ├── services/                 # REST API Client & Server-Sent Events (SSE)
│   │   ├── styles/                   # Design System Tokens & Global Styles
│   │   └── types/                    # Enterprise TypeScript Interfaces
│   └── vercel.json                   # Vercel SPA Routing Configuration
├── src/                              # NestJS Modular Backend (Render)
│   ├── agent/                        # LangGraph Graph, Billing, and Protection
│   ├── menu/                         # Menu Catalog & Dual-Pricing System
│   ├── api/                          # REST Endpoints & /api/events SSE Stream
│   ├── common/                       # PII Masking & Cryptographic Utils
│   ├── config/                       # Type-safe App Configuration
│   ├── database/                     # High-Speed In-Memory & File Store
│   ├── events/                       # Reactive Server-Sent Events (SSE) Module
│   └── whatsapp/                     # Meta Cloud API, Voice Notes & Audio Transcriber
├── scripts/                          # Seeding, Simulation, & Verification CLI
├── test/                             # Automated E2E & Vitest Integration Suites
└── render.yaml                       # Render Web Service Blueprint (API Only)
```

---

## 🚀 Quick Start

### Prerequisites
* Node.js 20+
* npm 10+

### 1. Environment Configuration
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Populate your credentials:
```env
PORT=3000
NODE_ENV=development

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_VERIFY_TOKEN=dil_se_catering_webhook_verify_secret

# AI Providers (Gemini / OpenAI / OpenRouter)
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

### 2. Start the Backend API (Port 3000)
```bash
npm install
npm run start:dev
```

### 3. Start the Operations Cockpit (Port 5173)
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🚢 Production Deployment

### Backend Deployment (Render)
The repository includes a ready-to-deploy [`render.yaml`](file:///c:/Users/vasiy/Documents/Catering/render.yaml) configured strictly for the NestJS API:
* **Service Name**: `dil-se-catering-api`
* **Runtime**: Node.js
* **Build Command**: `npm install && npm run build`
* **Start Command**: `npm run start:prod`

### Frontend Deployment (Vercel)
Deploy the `frontend/` directory directly to Vercel:
* **Framework Preset**: Vite
* **Root Directory**: `frontend`
* **Build Command**: `npm run build`
* **Output Directory**: `dist`
* **Environment Variable**: `VITE_API_BASE_URL=https://your-render-api.onrender.com/api`

---

## 🧪 Testing

Run the automated test suite powered by Vitest:
```bash
# Unit & integration tests
npm test

# E2E test suite
npm run test:e2e
```

---

## 🛡️ License
Private & Proprietary. All Rights Reserved © Dil Se Catering London.
