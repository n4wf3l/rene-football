import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, EnvelopeSimple, PaperPlaneTilt } from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import { useToast } from '../../components/ToastProvider'
import AuthLayout, { AUTH_BUTTON, AUTH_ERROR, AUTH_INPUT, AUTH_LABEL, AuthSpinner } from '../../components/admin/login/AuthLayout'

/**
 * /admin/mot-de-passe-oublie — asks for the admin email and sends a reset
 * link. The server answers the same way whether or not the account exists,
 * so this page always shows the same confirmation.
 */

interface LocationState {
  email?: string
}

export default function AdminForgotPassword() {
  const location = useLocation()
  const toast = useToast()
  const [email, setEmail] = useState((location.state as LocationState | null)?.email ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.post<{ message: string }>('/admin/forgot-password', { email })
      setSentMessage(res.message)
      toast.success('Demande envoyée.')
    } catch (err) {
      const data = err instanceof ApiError ? (err.data as { errors?: { email?: string[] }; message?: string } | null) : null
      const message = err instanceof ApiError && err.status === 429
        ? 'Trop de demandes. Réessayez dans une minute.'
        : data?.errors?.email?.[0] || data?.message || 'Envoi impossible pour le moment.'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <span className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.2em] text-[0.62rem] text-turf-700 dark:text-turf-300">
        <EnvelopeSimple size={12} weight="bold" /> Mot de passe oublié
      </span>
      <h2 className="mt-3 font-display font-semibold text-3xl lg:text-[2.4rem] tracking-tight text-zinc-950 dark:text-stone-50">
        {sentMessage ? 'Vérifiez vos emails.' : 'Recevez un nouveau lien.'}
      </h2>

      {sentMessage ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="mt-3 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">
            {sentMessage} Le lien est valable 60 minutes. Pensez à regarder dans les courriers indésirables.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/admin/login" state={{ email }} className={`${AUTH_BUTTON} w-auto px-5`}>
              <ArrowLeft size={15} weight="bold" />
              Retour à la connexion
            </Link>
            <button
              type="button"
              onClick={() => setSentMessage(null)}
              className="btn btn-ghost text-sm px-4 text-zinc-600 dark:text-stone-300"
            >
              Renvoyer un lien
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">
            Indiquez l'adresse email de votre accès. Vous recevrez un lien pour choisir un nouveau mot de passe.
          </p>
          <form onSubmit={onSubmit} className="mt-9 space-y-5">
            <label className="block">
              <span className={AUTH_LABEL}>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-2 ${AUTH_INPUT}`}
                placeholder="vous@renefootball.com"
              />
            </label>

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={AUTH_ERROR} role="alert">
                {error}
              </motion.div>
            )}

            <button type="submit" disabled={submitting} className={AUTH_BUTTON}>
              {submitting ? <><AuthSpinner /> Envoi…</> : <>Envoyer le lien <PaperPlaneTilt size={15} weight="bold" /></>}
            </button>
          </form>
          <Link
            to="/admin/login"
            className="mt-6 inline-flex items-center gap-2 self-start text-sm text-zinc-600 dark:text-stone-400 hover:text-zinc-950 dark:hover:text-stone-50 transition"
          >
            <ArrowLeft size={13} weight="bold" />
            Retour à la connexion
          </Link>
        </>
      )}
    </AuthLayout>
  )
}
