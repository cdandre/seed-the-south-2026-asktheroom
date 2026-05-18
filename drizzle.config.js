// Drizzle-kit pointer. auth-schema.js is produced by `@better-auth/cli generate`
// from auth.config.js, then `drizzle-kit generate` makes migration SQL from it.
export default {
  schema: "./auth-schema.js",
  out: "./drizzle",
  dialect: "sqlite",
};
