import { z } from "zod";

export const logsQuerySchema = z.object({
  level: z
    .enum(["INFO", "WARN", "ERROR", "DEBUG"])
    .optional(),
  app_name: z.string().min(1).max(255).optional(),
  search: z.string().max(500).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const statsQuerySchema = z.object({
  app_name: z.string().min(1).max(255).optional(),
  hours: z.coerce.number().int().min(1).max(720).default(24),
});

export type LogsQuery = z.infer<typeof logsQuerySchema>;
export type StatsQuery = z.infer<typeof statsQuerySchema>;
