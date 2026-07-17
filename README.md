# Camera Hub

เว็บสำหรับดูภาพสดจากกล้อง RTSP จำนวน 1–8 ตัว รองรับ Live Grid, Single View, Admin/Viewer RBAC และสิทธิ์ฟังเสียงรายผู้ใช้

## Architecture

- **Next.js 16 / TypeScript** — UI, API, authentication และ authorization
- **PostgreSQL / Prisma** — users, cameras, sessions และ audit log
- **MediaMTX / FFmpeg** — RTSP ingest, H.264/H.265 normalization, WebRTC และ LL-HLS
- **Caddy** — same-origin reverse proxy
- **Cloudflare Tunnel** — เปิดเว็บและ HLS จากภายนอก โดยไม่เปิด RTSP สู่ Internet

> Cloudflare Tunnel ไม่ขน WebRTC UDP media รุ่น MVP จึงใช้ WebRTC ใน LAN และ HLS จากภายนอก หากต้องการ low-latency จาก Internet ให้เพิ่ม Coturn ภายหลัง

## Local setup

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Create secret files under `secrets/`: `postgres_password`, `camera_encryption_key` (32 random bytes encoded as base64), `media_signing_secret`, and `internal_service_secret`.
3. Run `npm run db:generate`.
4. Start services with `docker compose up --build`.
5. Apply migrations and bootstrap an admin:
   ```sh
   docker compose exec app npx prisma migrate deploy
   docker compose exec -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD='replace-this-password' app npm run admin:bootstrap
   ```
6. Open `http://localhost:8080`.

Start synthetic streams with `docker compose --profile simulator up --build`.

## Security boundaries

- RTSP credentials are encrypted in PostgreSQL and never returned by public APIs.
- Camera targets must match `CAMERA_ALLOWED_CIDRS` and approved ports.
- Audio permission is enforced through distinct server media paths, not only frontend mute.
- Media grants are short-lived and exact-path/protocol scoped.
- Recording is disabled in the MVP.

See `docs/architecture.md` for deployment details and known limitations.
