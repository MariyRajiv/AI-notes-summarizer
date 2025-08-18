# AI-Powered Meeting Notes Summarizer & Sharer (Free-tier Friendly)

Full-stack app with:
- **Frontend**: Vite + React + TypeScript (ultra-basic UI, functionality-first)
- **Backend**: Node.js + Express
- **AI**: **OpenRouter** free models (default: `deepseek/deepseek-r1:free`, 163,840-token context)
- **Email**: Nodemailer via SMTP (works great with Mailtrap for testing)
- **Sharing**: Public, read-only share link (in-memory store)

## How it Works
1. Paste/upload a transcript (.txt).
2. Provide a custom instruction (e.g., “Summarize in bullet points for executives” or “Highlight only action items”).
3. Click **Generate Summary** → backend calls the model, returns a structured summary.
4. Edit the generated summary inline.
5. Share:
   - **Email**: enter recipients (comma separated) and send.
   - **Share Link**: one-click shareable URL; renders a readonly HTML page.

---

## Monorepo Structure
```
ai-meeting-notes-openrouter/
├─ frontend/        # Vite + React + TS
└─ backend/         # Node + Express + OpenRouter + Nodemailer
```

---

## Local Setup

### 1) Backend
```bash
cd backend
cp .env.example .env
# fill OPENROUTER_API_KEY and SMTP_* (Mailtrap recommended)
npm install
npm start
# => http://localhost:3001
```

Test health:
```bash
curl http://localhost:3001/api/health
```

### 2) Frontend
```bash
cd frontend
cp .env.example .env  # set VITE_API_BASE=http://localhost:3001
npm install
npm run dev
# open http://localhost:5173
```

---

## Deployment Guide

### Deploy Backend on Replit
1. Create a new **Node.js** Repl.
2. Upload the **backend** folder contents (ensure `package.json` and `server.js` are at Replit project root or configure the working dir).
3. In **Tools → Secrets**, add:
   - `OPENROUTER_API_KEY` (required — from https://openrouter.ai/ → Settings → API Keys)
   - `OPENROUTER_MODEL` (optional, default `deepseek/deepseek-r1:free`)
   - `CORS_ORIGIN` (set later to your Vercel domain)
   - `PUBLIC_BASE_URL` (set to the Replit URL shown at the top of the running repl)
   - `APP_TITLE` (optional)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` (Mailtrap is easiest for testing)
4. Click **Run**. Replit installs dependencies and launches the server (binds to `process.env.PORT`).
5. Copy the public URL (e.g., `https://your-repl-name.username.repl.co`).

### Deploy Frontend on Vercel
1. Push the whole project to GitHub (both `frontend/` and `backend/` folders).
2. On **Vercel**, click **New Project → Import Git Repository**.
3. Select the repo, then in **Root Directory** choose `frontend`.
4. Framework preset: **Vite** (auto-detected).
5. Add Environment Variable:
   - `VITE_API_BASE` = your Replit backend URL (e.g., `https://your-repl-name.username.repl.co`)
6. Deploy. After deploy finishes, open the URL (e.g., `https://ai-notes-yourname.vercel.app`).

### Connect CORS
- In Replit **Secrets**, set `CORS_ORIGIN` to your Vercel frontend URL (e.g., `https://ai-notes-yourname.vercel.app`), then restart the backend.
- Test **Generate Summary** and **Send Email** (Mailtrap inbox).

---

## Approach & Design Notes

- **Free & long-context**: targets OpenRouter `deepseek/deepseek-r1:free` (163,840-token context) so 3+ pages are easy.
- **Deterministic summaries**: low temperature (0.2).
- **Prompting**: system prompt enforces structure; user instruction controls style.
- **Safety**: share page escapes HTML to prevent XSS; emails send both text & minimal HTML.
- **Stateless**: share store is in-memory; for production, swap Map → database (e.g., Redis).
- **Portability**: SMTP via environment allows any provider (Mailtrap for dev, SendGrid/Resend/etc. for prod).

---

## Runbook / Troubleshooting

- **CORS errors**: Ensure `CORS_ORIGIN` on backend matches your Vercel frontend URL.
- **Auth errors**: Check `OPENROUTER_API_KEY` in backend environment.
- **Email not sending**: For dev, use Mailtrap SMTP. For Gmail, use App Passwords + port 465.
- **Share link 404**: The in-memory store resets when backend restarts; recreate the link.

---

## Final Deliverables Checklist

- ✅ Source code (frontend + backend)
- ✅ Working instructions & detailed run steps
- ✅ README with deployment steps (Vercel + Replit)
- ☐ Deployed links (fill after you deploy):
  - Frontend (Vercel): `https://...`
  - Backend (Replit): `https://...`
