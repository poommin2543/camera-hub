import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  CAMERA_ENCRYPTION_KEY_FILE: z.string().default("/run/secrets/camera_encryption_key"),
  MEDIA_SIGNING_SECRET_FILE: z.string().default("/run/secrets/media_signing_secret"),
  INTERNAL_SERVICE_SECRET_FILE: z.string().default("/run/secrets/internal_service_secret"),
  CAMERA_ALLOWED_CIDRS: z.string().default("192.168.0.0/16,10.0.0.0/8"),
  CAMERA_ALLOWED_PORTS: z.string().default("554,8554"),
  MEDIA_GRANT_TTL_SECONDS: z.coerce.number().int().min(15).max(120).default(45),
});

export const env = schema.parse(process.env);
