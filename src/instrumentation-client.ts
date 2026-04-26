// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { redactSentryEvent } from "@/lib/sentry-redact";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "https://1bf441fb65ebf0fb99284144a120940e@o4511162563559424.ingest.us.sentry.io/4511162563821568",

  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: 0.1,
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: redactSentryEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
