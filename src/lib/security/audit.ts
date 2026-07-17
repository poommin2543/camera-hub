import { db } from "@/lib/db";

export async function audit(input: {
  actorUserId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  return db.auditLog.create({ data: input });
}
