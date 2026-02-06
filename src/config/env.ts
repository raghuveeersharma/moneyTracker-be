import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000'),
  MONGO_URI: z.string(),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string().default('refresh_secret'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AESTHETIC_MODE: z.string().optional(), // Just a placeholder if we needed it
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  // In dev/test we might want to fail hard, but for now let's just warn or use defaults if possible
  // Actually, let's fail if MONGO_URI or JWT_SECRET are missing
  process.exit(1);
}

export const env = parsed.data;
