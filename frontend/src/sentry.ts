import * as Sentry from '@sentry/react'

/**
 * Sentry client-side init. No-op quand `VITE_SENTRY_DSN` est vide : en dev
 * local on n'a pas besoin de polluer un projet Sentry avec des erreurs
 * HMR, et le build staging peut rester muet jusqu'au setup du DSN.
 *
 * Les paramètres sont volontairement conservateurs côté RGPD : `dataCollection`
 * coupe l'envoi automatique des infos utilisateur, cookies, en-têtes et
 * paramètres d'URL vers Sentry. Si on veut un contexte utilisateur, on l'ajoute
 * explicitement via `Sentry.setUser({ id })` sans mail ni nom.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENV ?? import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    // RGPD: no personal data. Since @sentry v11 `sendDefaultPii` is gone and
    // `dataCollection` defaults to collecting user info, cookies, headers and
    // query strings - switch all of it off explicitly.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  })
}
