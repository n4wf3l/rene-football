import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle,
  EnvelopeSimple,
  MapPin,
  Phone,
  Warning,
} from '@phosphor-icons/react'
import { ApiError, api } from '../api/client'
import MeshGradient from '../components/MeshGradient'
import type { ContactForm, ContactErrors, ContactReason, ContactStatus } from '../types/contact'

interface ReasonOption {
  value: ContactReason
  label: string
  hint: string
}

const REASONS: ReasonOption[] = [
  { value: 'joueur',  label: 'Joueur',         hint: 'Vous êtes un joueur ou un parent.' },
  { value: 'club',    label: 'Club / Staff',   hint: 'Vous représentez un club professionnel.' },
  { value: 'medias',  label: 'Médias',         hint: 'Demande de presse ou interview.' },
  { value: 'autre',   label: 'Autre',          hint: 'Toute autre demande.' },
]

const initialForm: ContactForm = {
  reason: 'joueur',
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  consent: false,
}

function validate(form: ContactForm): ContactErrors {
  const errors: ContactErrors = {}
  if (!form.name || form.name.trim().length < 2) errors.name = 'Indiquez votre nom complet.'
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Adresse email invalide.'
  if (!form.message || form.message.trim().length < 10) errors.message = 'Détaillez votre demande (10 caractères minimum).'
  if (!form.consent) errors.consent = 'Vous devez accepter le traitement de vos données.'
  return errors
}

interface FieldLabelProps {
  htmlFor: string
  children: ReactNode
  optional?: boolean
}

function FieldLabel({ htmlFor, children, optional }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-900 mb-2">
      {children}
      {optional && <span className="ml-2 font-normal text-zinc-400 text-xs">(facultatif)</span>}
    </label>
  )
}

interface FieldErrorProps {
  message?: string
}

function FieldError({ message }: FieldErrorProps) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-rose-700">{message}</p>
}

const inputBase =
  'w-full rounded-xl border bg-white text-zinc-900 placeholder:text-zinc-400 px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-turf-700/20'

function ContactPage() {
  const [form, setForm] = useState<ContactForm>(initialForm)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<ContactStatus>(null)

  const update =
    <K extends keyof ContactForm>(field: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.target
      const value =
        target instanceof HTMLInputElement && target.type === 'checkbox'
          ? target.checked
          : target.value
      setForm((prev) => ({ ...prev, [field]: value as ContactForm[K] } as ContactForm))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const v = validate(form)
    if (Object.keys(v).length) {
      setErrors(v)
      const firstField = Object.keys(v)[0]
      const el = document.getElementById(`contact-${firstField}`)
      el?.focus()
      return
    }

    setSubmitting(true)
    setStatus(null)
    try {
      await api.post('/contact', form)
      setStatus('success')
      setForm(initialForm)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const data = err.data as { errors?: Record<string, unknown> } | null | undefined
        if (err.status === 422 && data?.errors) {
          // Server-side validation: hoist field errors into the form.
          const serverErrors: ContactErrors = {}
          for (const [field, messages] of Object.entries(data.errors)) {
            const key = field as keyof ContactForm
            serverErrors[key] = Array.isArray(messages) ? String(messages[0]) : String(messages)
          }
          setErrors(serverErrors)
          const firstField = Object.keys(serverErrors)[0]
          document.getElementById(`contact-${firstField}`)?.focus()
        } else if (err.status === 429) {
          setStatus('throttled')
        } else {
          setStatus('error')
        }
      } else {
        setStatus('error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'success') {
    return (
      <section className="bg-stone-50 min-h-[80vh] py-24 lg:py-32">
        <div className="container-page">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 110, damping: 20 }}
            className="max-w-[60ch]"
          >
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-turf-50 border border-turf-100 text-turf-800">
              <CheckCircle size={26} weight="regular" />
            </div>
            <span className="font-mono uppercase tracking-[0.2em] text-xs text-turf-700 mt-8 inline-block">
              Demande envoyée
            </span>
            <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest text-zinc-950 leading-[1.05]">
              Nous reviendrons vers vous sous 48 heures.
            </h1>
            <p className="mt-6 text-base lg:text-lg text-zinc-600 leading-relaxed">
              Votre message a bien été reçu. Notre équipe traite chaque
              demande personnellement - nous priorisons les sujets selon
              leur urgence et votre profil.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStatus(null)}
                className="btn btn-outline text-sm"
              >
                Envoyer une autre demande
              </button>
              <Link to="/joueurs" className="btn btn-primary text-sm">
                Découvrir nos joueurs
                <ArrowRight size={15} weight="bold" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden text-stone-100">
        <MeshGradient intensity="medium" />
        <div className="container-page pt-16 pb-12 lg:pt-24 lg:pb-16">
          <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
            Prendre contact
          </span>
          <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest leading-[1.05] text-stone-50 max-w-[20ch]">
            Échangeons sur votre projet.
          </h1>
          <p className="mt-6 max-w-[58ch] text-base lg:text-lg text-stone-400 leading-relaxed">
            Joueur, famille, club professionnel ou journaliste : remplissez
            le formulaire ci-dessous et notre équipe revient vers vous
            sous 48 heures. Échange confidentiel, sans engagement.
          </p>
        </div>
      </section>

      <section className="bg-stone-50 py-16 lg:py-24">
        <div className="container-page grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* FORM */}
          <form
            noValidate
            onSubmit={handleSubmit}
            className="lg:col-span-7 rounded-3xl bg-white border border-stone-200/80 p-6 sm:p-8 lg:p-10 shadow-diffusion"
          >
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-900"
                role="alert"
              >
                <Warning size={18} weight="regular" className="text-rose-700 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">L'envoi a échoué.</div>
                  <div className="text-rose-800/80 mt-0.5">
                    Réessayez dans un instant ou écrivez-nous directement à{' '}
                    <a href="mailto:contact@renefootball.com" className="underline">
                      contact@renefootball.com
                    </a>
                    .
                  </div>
                </div>
              </motion.div>
            )}

            {status === 'throttled' && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900"
                role="alert"
              >
                <Warning size={18} weight="regular" className="text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Trop de demandes envoyées.</div>
                  <div className="text-amber-800/80 mt-0.5">
                    Patientez une minute avant de réessayer, ou écrivez-nous à{' '}
                    <a href="mailto:contact@renefootball.com" className="underline">
                      contact@renefootball.com
                    </a>
                    .
                  </div>
                </div>
              </motion.div>
            )}

            {/* Reason */}
            <fieldset>
              <legend className="block text-sm font-medium text-zinc-900 mb-3">
                Vous nous écrivez en tant que
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REASONS.map((r) => {
                  const active = form.reason === r.value
                  return (
                    <label
                      key={r.value}
                      className={`relative flex items-center justify-center px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors border ${
                        active
                          ? 'bg-zinc-950 border-zinc-950 text-stone-50'
                          : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 hover:text-zinc-950'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={active}
                        onChange={update('reason')}
                        className="sr-only"
                      />
                      {r.label}
                    </label>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {REASONS.find((r) => r.value === form.reason)?.hint}
              </p>
            </fieldset>

            <div className="mt-7 grid sm:grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="contact-name">Nom complet</FieldLabel>
                <input
                  id="contact-name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={update('name')}
                  aria-invalid={Boolean(errors.name)}
                  className={`${inputBase} ${errors.name ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
                  placeholder="Hélène Marchetti"
                />
                <FieldError message={errors.name} />
              </div>
              <div>
                <FieldLabel htmlFor="contact-email">Email</FieldLabel>
                <input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={update('email')}
                  aria-invalid={Boolean(errors.email)}
                  className={`${inputBase} ${errors.email ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
                  placeholder="vous@example.com"
                />
                <FieldError message={errors.email} />
              </div>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="contact-phone" optional>Téléphone</FieldLabel>
                <input
                  id="contact-phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  className={`${inputBase} border-stone-300 focus:border-turf-700`}
                  placeholder="+352 661 24 18 47"
                />
              </div>
              <div>
                <FieldLabel htmlFor="contact-subject" optional>Sujet</FieldLabel>
                <input
                  id="contact-subject"
                  type="text"
                  value={form.subject}
                  onChange={update('subject')}
                  className={`${inputBase} border-stone-300 focus:border-turf-700`}
                  placeholder="Représentation, transfert, interview…"
                />
              </div>
            </div>

            <div className="mt-5">
              <FieldLabel htmlFor="contact-message">Votre message</FieldLabel>
              <textarea
                id="contact-message"
                rows={6}
                value={form.message}
                onChange={update('message')}
                aria-invalid={Boolean(errors.message)}
                className={`${inputBase} resize-y min-h-[140px] ${errors.message ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
                placeholder="Décrivez votre situation et votre besoin. Plus c'est précis, mieux nous pourrons vous orienter."
              />
              <FieldError message={errors.message} />
            </div>

            {/* Consent */}
            <label
              className={`mt-6 flex gap-3 items-start cursor-pointer rounded-xl border p-4 transition ${
                errors.consent
                  ? 'border-rose-300 bg-rose-50/40'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <input
                id="contact-consent"
                type="checkbox"
                checked={form.consent}
                onChange={update('consent')}
                className="mt-0.5 w-4 h-4 rounded border-stone-300 text-turf-800 focus:ring-turf-700/30 accent-turf-800"
              />
              <span className="text-sm text-zinc-700 leading-relaxed">
                J'accepte que mes données personnelles soient utilisées par
                Rene Football pour traiter ma demande.
                <br />
                <Link
                  to="/confidentialite"
                  className="text-turf-800 underline underline-offset-2 hover:text-turf-700"
                >
                  Politique de confidentialité
                </Link>
                <span className="text-zinc-500"> · Vos données ne sont jamais transmises à des tiers.</span>
              </span>
            </label>
            <FieldError message={errors.consent} />

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <motion.span
                      aria-hidden="true"
                      className="inline-block w-3.5 h-3.5 rounded-full border-2 border-stone-50/30 border-t-stone-50"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
                    />
                    Envoi en cours…
                  </>
                ) : (
                  <>
                    Envoyer ma demande
                    <ArrowRight size={15} weight="bold" />
                  </>
                )}
              </button>
              <p className="text-xs text-zinc-500">
                Réponse sous <span className="font-mono text-zinc-700">48h</span> ouvrées.
              </p>
            </div>
          </form>

          {/* Sidebar */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="rounded-3xl bg-zinc-950 text-stone-100 p-6 lg:p-8 relative overflow-hidden">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -right-12 w-72 h-72 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(15,81,50,0.4), transparent 70%)' }}
              />
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
                Coordonnées directes
              </div>
              <h2 className="mt-3 font-display font-semibold text-2xl lg:text-3xl tracking-tight text-stone-50 max-w-[18ch]">
                Si vous préférez nous écrire ou appeler.
              </h2>

              <ul className="mt-8 space-y-5">
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-stone-50/5 border border-stone-50/10 text-turf-300 shrink-0">
                    <EnvelopeSimple size={16} weight="regular" />
                  </span>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400">
                      Email
                    </div>
                    <a
                      href="mailto:contact@renefootball.com"
                      className="text-stone-100 hover:text-stone-50 transition"
                    >
                      contact@renefootball.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-stone-50/5 border border-stone-50/10 text-turf-300 shrink-0">
                    <Phone size={16} weight="regular" />
                  </span>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400">
                      Téléphone
                    </div>
                    <a
                      href="tel:+352661241847"
                      className="font-mono text-stone-100 hover:text-stone-50 transition tabular-nums"
                    >
                      +352 661 24 18 47
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-stone-50/5 border border-stone-50/10 text-turf-300 shrink-0">
                    <MapPin size={16} weight="regular" />
                  </span>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400">
                      Bureau
                    </div>
                    <div className="text-stone-100">Luxembourg-Ville · Luxembourg</div>
                    <div className="text-xs text-stone-400 mt-0.5">Sur rendez-vous uniquement.</div>
                  </div>
                </li>
              </ul>

              <div className="mt-10 pt-6 border-t border-stone-50/10">
                <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400 mb-2">
                  Délai de réponse
                </div>
                <div className="font-mono text-2xl tabular-nums text-stone-50">
                  48<span className="text-stone-400 text-lg ml-1">h</span>
                </div>
                <p className="text-xs text-stone-400 mt-1.5">
                  Lundi à vendredi, hors jours fériés.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-stone-200/80 bg-white p-5 text-sm text-zinc-600 leading-relaxed">
              Vos données sont stockées sur des serveurs européens et
              conservées <span className="font-mono text-zinc-900">12 mois</span> maximum
              après le dernier échange. Vous pouvez à tout moment demander
              leur suppression depuis{' '}
              <Link to="/confidentialite" className="text-turf-800 underline underline-offset-2">
                cette page
              </Link>
              .
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}

export default ContactPage
