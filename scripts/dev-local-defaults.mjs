/** Defaults for `pnpm run dev:local` when vars are not already set. */
process.env.NODE_ENV ??= "development";
process.env.PORT ??= "8080";
process.env.BASE_PATH ??= "/";
process.env.VITE_API_PROXY_TARGET ??= "http://localhost:8080";
process.env.EXPO_PUBLIC_DOMAIN ??= "https://vndrly.ai";
process.env.SESSION_SECRET ??= "local-dev-session-secret-change-in-production";
