/// <reference types="vite/client" />

interface ImportMetaEnv {
  OSRD_BACKEND_URL: string;
  OSRD_SENTRY_DSN: string;
  OSRD_SENTRY_ENVIRONMENT: string;
  OSRD_GIT_DESCRIBE: string;
}
