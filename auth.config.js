// CLI-only static config consumed by `@better-auth/cli generate` to produce
// auth-schema.js. NOT imported at runtime. The runtime config lives in auth.js.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const stubDb = {};

export const auth = betterAuth({
  appName: "Ask the Room",
  database: drizzleAdapter(stubDb, { provider: "sqlite", usePlural: true }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      name: { type: "string", required: true, input: true },
    },
  },
});
