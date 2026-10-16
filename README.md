# SKA PRODUCTIONS — website

Next.js 16 site for skaproductions.com: festival IPs, upcoming shows, artist casting, history, and an
admin at `/admin` for shows, posters, lineups, seat maps and after-show photos.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000  (admin: /admin)
```

Settings live in `.env.local` (see `.env.example`):

| Variable | Needed | What it does |
| --- | --- | --- |
| `SKA_ADMIN_PASSWORD` | yes | Password for `/admin` |
| `BLOB_READ_WRITE_TOKEN` | on Vercel | Stores shows and images in Vercel Blob. Without it, data is kept on disk in `data/ska/` |
| `ANTHROPIC_API_KEY` | optional | English → Korean auto-translation in the admin |
| `SKA_INQUIRY_WEBHOOK_URL` | optional | Slack/Discord webhook for casting inquiries |

## Deploy to Vercel

1. Push this folder to a GitHub repository and import it at vercel.com/new.
2. In the Vercel project: **Storage → Create → Blob** and connect it to the project
   (this adds `BLOB_READ_WRITE_TOKEN`).
3. **Settings → Environment Variables**: add `SKA_ADMIN_PASSWORD` (and the optional ones).
4. Copy the current local data into Blob once. Put the store's `BLOB_READ_WRITE_TOKEN` in
   `.env.blob` (not `.env.local`, so local dev keeps using disk and never touches live data):
   ```bash
   npm run migrate:blob -- --dry   # check
   npm run migrate:blob
   ```
5. Redeploy. From then on, edit content in the live admin (https://www.skaproductions.com/admin).

## Connect skaproductions.com

The domain is managed in **Squarespace Domains** (formerly Google Domains), and also serves Google
Workspace email.

1. Vercel project → **Settings → Domains** → add `skaproductions.com` and `www.skaproductions.com`.
2. Squarespace → Domains → skaproductions.com → **DNS → DNS Settings**:
   - delete the *Squarespace Defaults* A records (`198.185.159.x`, `198.49.23.x`) and the
     `www → ext-sq.squarespace.com` CNAME;
   - add `A  @  76.76.21.21` and `CNAME  www  cname.vercel-dns.com`
     (use the values Vercel shows if they differ);
   - **keep the Google Workspace MX and TXT records** — removing them stops email.
3. Wait for DNS (minutes, up to 48h). Vercel issues HTTPS automatically.
