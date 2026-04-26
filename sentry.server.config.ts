// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { redactSentryEvent } from "@/lib/sentry-redact";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  enableLogs: true,
  sendDefaultPii: false,
  // Defense-in-depth on top of sendDefaultPii: scrub buyer-typed phone +
  // email out of breadcrumbs, exception messages, and request bodies.
  beforeSend: redactSentryEvent,
});
