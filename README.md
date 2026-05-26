# BuildBook

**BuildBook** is an internal engineering project documentation platform built for YAS Networks. It gives engineering teams a single place to manage projects, upload technical artifacts, generate AI-powered implementation specs, and produce structured project reports — all behind role-based access control.

---

## What It Does

BuildBook solves the "docs live everywhere" problem. Instead of specs in Google Docs, files in Slack, and reports in email threads, every project has a single home:

- A **project record** with description, tech stack, status, and ownership
- **File buckets** for organized artifact storage (infrastructure diagrams, API schemas, design files, etc.)
- An **AI spec generator** that turns rough draft ideas into a structured implementation spec
- An **AI report generator** that produces a formatted project report from all uploaded files
- An **approval workflow** for specs (Draft → In Review → Approved)
- **Role-based access** so engineers can work freely while managers control approvals

---

## Roles & Permissions

| Action | Engineer | Manager | Admin |
|---|---|---|---|
| View projects | Yes | Yes | Yes |
| Create / edit projects | Yes | Yes | Yes |
| Upload files | Yes | Yes | Yes |
| Generate spec | Yes | Yes | Yes |
| Approve / reject spec | No | Yes | Yes |
| Generate report | Yes | Yes | Yes |
| View all devices | No | No | Yes |
| Invite new devices | No | Yes | Yes |

Roles are set per-device at join time. Admins can change roles after the fact.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database | Prisma Postgres (hosted) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Auth | Device-based JWT (`jose`), cookie + localStorage |
| File storage | AWS S3 (presigned PUT uploads) |
| AI (specs) | Google Gemini 2.5 Flash |
| AI (reports) | Google Gemini 2.5 Flash |
| Markdown rendering | react-markdown + remark-gfm |
| Styling | Tailwind CSS + @tailwindcss/typography |
| Deployment | Vercel |

---

## Authentication

BuildBook uses **device-based auth** — there are no user accounts with passwords. Instead, each laptop or workstation is a "device" that belongs to a company.

**First-time setup (Admin):**
1. Navigate to `/register`
2. Enter your device name, company name, and a company join code
3. The first device to register for a company is automatically granted the `ADMIN` role
4. You receive a JWT stored in both a cookie (for the proxy/middleware) and localStorage (for API calls)

**Subsequent team members (Engineer / Manager):**
1. Navigate to `/join`
2. Enter your device name and the company join code
3. An Admin must approve your request from the `/devices` page
4. Once approved, you're automatically redirected to the dashboard

The proxy (`proxy.ts`) runs on every request and validates the JWT cookie. Public routes (`/register`, `/join`, `/api/auth/*`) are exempt.

---

## Project Lifecycle

```
Create Project → Upload Files → Generate Spec → Review & Approve → Generate Report
```

1. **Create**: Name, description, tech stack tags, and status (Planning / Active / On Hold / Completed)
2. **Upload**: Drop files into categorized buckets — the bucket is auto-detected from the filename, or you can move files between buckets manually
3. **Spec**: Paste rough ideas or upload a `.txt`/`.md` draft → AI generates a full structured spec
4. **Approve**: Managers move the spec through Draft → In Review → Approved
5. **Report**: AI reads all uploaded file metadata and generates a formatted Markdown report

---

## File Buckets

Files are organized into 9 buckets per project:

| Bucket | Purpose |
|---|---|
| Infrastructure | Architecture diagrams, network maps, IaC files |
| Frontend | UI mockups, component designs, style guides |
| Backend / API | API schemas, OpenAPI specs, service definitions |
| Database | ERDs, migration scripts, seed data |
| Deployment | CI/CD configs, Dockerfiles, deployment scripts |
| Monitoring | Alert configs, dashboard screenshots, runbooks |
| Testing | Test plans, coverage reports, QA docs |
| Design | Figma exports, brand assets, wireframes |
| Other | Anything that doesn't fit elsewhere |

Files are uploaded directly to S3 via presigned PUT URLs — the server never proxies the file bytes. After upload, only the S3 URL and metadata are saved to the database.

---

## AI Features

### Spec Generator

**How to use:**
1. Open a project and click **Spec** in the top-right
2. Paste your rough ideas into the text area — or click **Upload file** to import a `.txt` or `.md` draft
3. Click **Generate spec** — Gemini 2.5 Flash processes your input alongside the project's name, description, and tech stack
4. The generated spec appears as a formatted Markdown document with:
   - Overview & Problem Statement
   - Proposed Solution
   - Technical Architecture
   - Recommended Tech Stack
   - Implementation Phases (with checkboxes)
   - Dependencies & Risks
   - Success Metrics
   - Open Questions
5. Click **New version** to regenerate with updated input — all versions are preserved
6. Use **Export PDF** to print to PDF via the browser

**Approval flow (Managers only):**
- **Mark in review** moves the spec from Draft → In Review
- **Approve** moves it from In Review → Approved
- **Revert to draft** resets back to Draft if revisions are needed

### Report Generator

**How to use:**
1. Open a project and click **Report**
2. Click **Generate report** — Gemini analyzes all uploaded files and project metadata
3. The report covers: executive summary, file inventory by bucket, architecture observations, next steps, and risks
4. Use **Export PDF** to print to PDF

---

## Setup

### Prerequisites

- Node.js 18+
- AWS account with S3 access
- Google Gemini API key
- Prisma Postgres connection string

### Environment Variables

Create `.env.local` in the project root:

```env
# Database
POSTGRES_URL=postgres://...

# Auth
JWT_SECRET=your-random-secret-32-chars-minimum

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=buildbook-files

# AI
GEMINI_API_KEY=AIza...
```

### Install & Run

```bash
npm install
npx prisma db push       # apply schema to database
npm run dev              # start dev server on localhost:3000
```

### Production Deploy (Vercel)

```bash
npx vercel env add POSTGRES_URL
npx vercel env add JWT_SECRET
npx vercel env add AWS_ACCESS_KEY_ID
npx vercel env add AWS_SECRET_ACCESS_KEY
npx vercel env add AWS_REGION
npx vercel env add S3_BUCKET_NAME
npx vercel env add GEMINI_API_KEY
npx vercel --prod
```

---

## Usage Guide

### As an Admin

1. Register at `/register` — you'll be the first device and get Admin role
2. Share the company join code with your team (visible in the join flow)
3. Approve incoming device requests at `/devices`
4. Promote Engineers to Managers by editing their role

### As a Manager

1. Join at `/join` and wait for Admin approval
2. Create projects from `/projects` → **New project**
3. Review specs submitted by engineers — use **Mark in review** then **Approve**
4. Generate reports when a project milestone is reached

### As an Engineer

1. Join at `/join` and wait for approval
2. Open a project and upload relevant files to the correct buckets
3. Use the Spec tab to paste your implementation ideas and generate a structured spec
4. Share the spec link with your manager for review

---

## Database Schema

```
Company
  └── Device (ADMIN | MANAGER | ENGINEER)
       └── Project
            ├── File (bucket: INFRASTRUCTURE | FRONTEND | BACKEND_API | ...)
            ├── Spec (DRAFT | IN_REVIEW | APPROVED)
            └── Report
```

- Every `Project` belongs to a `Device` (owner) and a `Company` (tenant)
- `File` records store only metadata + S3 URL — file bytes live in S3
- `Spec` records store both the original `inputText` and the AI-generated `markdownContent`
- All multi-tenant queries filter by `companyId` to enforce data isolation

---

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register first device for a company |
| POST | `/api/auth/join` | Public | Request to join an existing company |
| GET | `/api/auth/me` | Required | Get current device info |
| GET | `/api/projects` | Required | List all projects for this company |
| POST | `/api/projects` | Required | Create a project |
| GET | `/api/projects/[id]` | Required | Get project with files and specs |
| PUT | `/api/projects/[id]` | Required | Update project |
| DELETE | `/api/projects/[id]` | Required | Delete project |
| POST | `/api/files/presign` | Required | Get S3 presigned upload URL |
| POST | `/api/files` | Required | Save file metadata after S3 upload |
| PUT | `/api/files/[id]` | Required | Move file to different bucket |
| DELETE | `/api/files/[id]` | Required | Delete file |
| GET | `/api/projects/[id]/spec` | Required | List all spec versions |
| POST | `/api/projects/[id]/spec` | Required | Generate new spec version |
| PATCH | `/api/projects/[id]/spec/[specId]` | Manager+ | Update spec status |
| POST | `/api/projects/[id]/report` | Required | Generate project report |
| GET | `/api/devices` | Admin | List all devices |
| PATCH | `/api/devices/[id]` | Admin | Update device role or approval |
