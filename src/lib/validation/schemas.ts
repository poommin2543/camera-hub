import { z } from "zod";

export const cameraInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  rtspUrl: z.string().min(1).max(2048),
  enabled: z.boolean().default(true),
  rtspTransport: z.enum(["TCP", "AUTOMATIC"]).default("TCP"),
});

export const cameraPatchSchema = cameraInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field must be provided" },
);

export const userInputSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(12).max(128).optional(),
  role: z.enum(["ADMIN", "VIEWER"]),
  canListenAudio: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
