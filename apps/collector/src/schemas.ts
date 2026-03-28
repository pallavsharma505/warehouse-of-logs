import { z } from "zod";

const logLevels = ["INFO", "WARN", "ERROR", "DEBUG"] as const;

export const singleLogSchema = z.object({
  app_name: z.string().min(1).max(255),
  level: z.enum(logLevels),
  message: z.string().min(1).max(10000),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
  persist: z.boolean().optional().default(false),
  expires_in: z.number().int().min(1).max(31536000).optional(), // seconds, max 1 year
});

export const batchLogSchema = z.array(singleLogSchema).min(1).max(1000);

export const ingestBodySchema = z.union([singleLogSchema, batchLogSchema]);

export type SingleLogInput = z.infer<typeof singleLogSchema>;
export type BatchLogInput = z.infer<typeof batchLogSchema>;
