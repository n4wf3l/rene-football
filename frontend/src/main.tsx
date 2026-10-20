import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import * as Sentry from '@sentry/react'
import './index.css'
import './i18n'
import { initSentry } from './sentry'
import App from './App'
import { ToastProvider } from './components/ToastProvider'
import { ConfirmProvider } from './components/ConfirmProvider'

initSentry()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<SentryErrorFallback />}>
      <HelmetProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </HelmetProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)

function SentryErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-stone-100 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3">Une erreur est survenue</h1>
        <p className="text-sm text-zinc-600 dark:text-stone-400 mb-6">
          Nous avons été notifiés et travaillons sur le problème. Vous pouvez
          recharger la page pour réessayer.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn bg-zinc-950 text-stone-50 hover:bg-zinc-800 dark:bg-stone-50 dark:text-zinc-950"
        >
          Recharger
        </button>
      </div>
    </div>
  )
}
