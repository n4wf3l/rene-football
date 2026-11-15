import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Eye, EyeSlash, Key } from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import { useToast } from '../../components/ToastProvider'
import AuthLayout, { AUTH_BUTTON, AUTH_ERROR, AUTH_INPUT, AUTH_LABEL, AuthSpinner } from '../../components/admin/login/AuthLayout'

/**
 * /admin/reinitialiser?token=…&email=… — opened from the reset email.
 * Sets the new password (10+ characters, at least one letter and one
 * digit, same rules as the server), then sends the user back to sign in.
 * Every open session is closed by the server on success.
 */

type FieldErrors = Partial<Record<'token' | 'email' | 'password', string>>

const RULES = [
  { label: '10 caractères minimum', test: (v: string) => v.length >= 10 },
  { label: 'Au moins une lettre', test: (v: string) => /\p{L}/u.test(v) },
  { label: 'Au moins un chiffre', test: (v: string) => /\d/.test(v) },
]

export default function AdminResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const rulesOk = RULES.every((r) => r.test(password))
  const matches = confirmation.length > 0 && confirmation === password

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)
    try {
      await api.post('/admin/reset-password', { token, email, password, password_confirmation: confirmation })
      toast.success('Mot de passe modifié.')
      navigate('/admin/login', { replace: true, state: { passwordReset: true, email } })
    } catch (err) {
      const data = err instanceof ApiError
        ? (err.data as { errors?: Record<string, string[]>; message?: string } | null)
        : null
      const next: FieldErrors = {
        token: data?.errors?.token?.[0],
        email: data?.errors?.email?.[0],
        password: data?.errors?.password?.[0],
      }
      if (!next.token && !next.email && !next.password) {
        next.password = err instanceof ApiError && err.status === 429
          ? 'Trop de tentatives. Réessayez dans une minute.'
          : data?.message || 'Modification impossible pour le moment.'
      }
      setErrors(next)
      toast.error(next.token || next.email || next.password || 'Modification impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  const linkProblem = !token || !email ? 'Ce lien est incomplet.' : errors.token || errors.email

  return (
    <AuthLayout>
      <span className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.2em] text-[0.62rem] text-turf-700 dark:text-turf-300">
        <Key size={12} weight="bold" /> Nouveau mot de passe
      </span>
      <h2 className="mt-3 font-display font-semibold text-3xl lg:text-[2.4rem] tracking-tight text-zinc-950 dark:text-stone-50">
        {linkProblem ? 'Lien expiré.' : 'Choisissez-en un nouveau.'}
      </h2>

      {linkProblem ? (
        <>
          <p className="mt-3 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">
            {linkProblem} Les liens de réinitialisation sont valables 60 minutes et ne servent qu'une fois.
          </p>
          <Link to="/admin/mot-de-passe-oublie" state={{ email }} className={`${AUTH_BUTTON} mt-8`}>
            Demander un nouveau lien
            <ArrowRight size={15} weight="bold" />
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">
            Pour le compte <span className="font-medium text-zinc-900 dark:text-stone-100">{email}</span>.
            Les sessions ouvertes seront fermées.
          </p>
          <form onSubmit={onSubmit} className="mt-9 space-y-5">
            <label className="block">
              <span className={AUTH_LABEL}>Nouveau mot de passe</span>
              <div className="relative mt-2">
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${AUTH_INPUT} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-lg text-zinc-500 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-50 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
                >
                  {show ? <EyeSlash size={16} weight="regular" /> : <Eye size={16} weight="regular" />}
                </button>
              </div>
            </label>

            <ul className="grid gap-1.5 text-xs" aria-label="Règles du mot de passe">
              {RULES.map((r) => {
                const ok = r.test(password)
                return (
                  <li key={r.label} className={`flex items-center gap-2 transition-colors ${ok ? 'text-turf-700 dark:text-turf-300' : 'text-zinc-500 dark:text-stone-500'}`}>
                    <span className={`grid place-items-center w-4 h-4 rounded-full border ${ok ? 'border-transparent bg-turf-600 text-stone-50 dark:bg-turf-400 dark:text-zinc-950' : 'border-stone-300 dark:border-stone-50/15'}`}>
                      {ok && <Check size={9} weight="bold" />}
                    </span>
                    {r.label}
                  </li>
                )
              })}
            </ul>

            <label className="block">
              <span className={AUTH_LABEL}>Confirmation</span>
              <input
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className={`mt-2 ${AUTH_INPUT}`}
              />
              {confirmation.length > 0 && !matches && (
                <span className="mt-1.5 block text-xs text-rose-700 dark:text-rose-300">Les deux mots de passe ne correspondent pas.</span>
              )}
            </label>

            {errors.password && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={AUTH_ERROR} role="alert">
                {errors.password}
              </motion.div>
            )}

            <button type="submit" disabled={submitting || !rulesOk || !matches} className={AUTH_BUTTON}>
              {submitting ? <><AuthSpinner /> Enregistrement…</> : <>Enregistrer le mot de passe <ArrowRight size={15} weight="bold" /></>}
            </button>
          </form>
        </>
      )}

      <Link
        to="/admin/login"
        className="mt-6 inline-flex items-center gap-2 self-start text-sm text-zinc-600 dark:text-stone-400 hover:text-zinc-950 dark:hover:text-stone-50 transition"
      >
        <ArrowLeft size={13} weight="bold" />
        Retour à la connexion
      </Link>
    </AuthLayout>
  )
}
