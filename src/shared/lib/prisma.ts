import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "../lib/env.js";

const connectionString = env.USE_DEV_DATABASE
  ? env.DATABASE_URL_DEV
  : env.DATABASE_URL_PROD;

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
