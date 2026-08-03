import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { env } from "./env.js";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.API_BASE_URL,
  trustedOrigins: [env.WEB_APP_BASE_URL, "http://localhost:3000"],
  advanced: {
    crossSubDomainCookies: {
      enabled: !!env.COOKIE_DOMAIN,
      ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    },
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [openAPI()],
});
