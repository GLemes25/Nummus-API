import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "homologation"])
    .default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url(),
  DATABASE_URL_DEV: z.url(),
  DATABASE_URL_PROD: z.url(),
  USE_DEV_DATABASE: z.coerce.boolean().default(false),
  API_BASE_URL: z.url(),
  WEB_APP_BASE_URL: z.url(),
  COOKIE_DOMAIN: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "Erro na validação das variáveis de ambiente:",
    parsedEnv.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsedEnv.data;
