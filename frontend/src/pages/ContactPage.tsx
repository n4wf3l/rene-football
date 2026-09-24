import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CheckCircle,
  EnvelopeSimple,
  MapPin,
  MegaphoneSimple,
  PaperclipHorizontal,
  Phone,
  Question,
  SoccerBall,
  Warning,
} from '@phosphor-icons/react'
import { ApiError, api } from '../api/client'
import MeshGradient from '../components/MeshGradient'
import { useDarkHero } from '../hooks/useDarkHero'
import { usePublicPlayers } from '../lib/usePublicPlayers'
import type {
  ContactErrors,
  ContactForm,
  ContactReason,
  ContactStatus,
} from '../types/contact'

/* -------------------------------------------------------------------------- */
/*  Audience picker options                                                   */
/* -------------------------------------------------------------------------- */

interface AudienceOption {
  value: ContactReason
  label: string
  hint: string
  Icon: typeof SoccerBall
}

const AUDIENCES: AudienceOption[] = [
  { value: 'joueur',  label: 'Joueur / Parent',       hint: 'Vous voulez rejoindre l’agence ou faire suivre un profil.', Icon: SoccerBall },
  { value: 'club',    label: 'Club / Staff technique', hint: 'Intérêt pour un joueur, recherche de profil, partenariat.', Icon: Buildings },
  { value: 'medias',  label: 'Média / Journaliste',   hint: 'Interview, article, documentaire.',                          Icon: MegaphoneSimple },
  { value: 'autre',   label: 'Autre',                  hint: 'Toute autre demande.',                                       Icon: Question },
]

/* -------------------------------------------------------------------------- */
/*  Initial form + helpers                                                    */
/* -------------------------------------------------------------------------- */

const emptyForm: ContactForm = {
  reason: 'joueur',
  name: '',
  email: '',
  phone: '',
  message: '',
  consent: false,
  payload: {},
  cv: null,
}

function labelForReason(r: ContactReason): string {
  return AUDIENCES.find((a) => a.value === r)?.label ?? r
}

/* -------------------------------------------------------------------------- */
/*  Reusable field primitives                                                 */
/* -------------------------------------------------------------------------- */

const inputBase =
  'w-full rounded-xl border bg-white text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:border-stone-50/15 dark:focus:border-turf-300 px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-turf-700/20 dark:focus:ring-turf-300/20'

function FieldLabel({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-900 dark:text-stone-100 mb-2">
      {children}
      {optional && <span className="ml-2 font-normal text-zinc-400 dark:text-stone-500 text-xs">(facultatif)</span>}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-rose-700 dark:text-rose-400">{message}</p>
}

/* -------------------------------------------------------------------------- */
/*  Step 1 — Audience picker                                                  */
/* -------------------------------------------------------------------------- */

function StepAudience({
  reason,
  onPick,
}: {
  reason: ContactReason
  onPick: (r: ContactReason) => void
}) {
  return (
    <div>
      <h2 className="font-display font-semibold text-2xl lg:text-3xl tracking-tight text-zinc-950 dark:text-stone-50">
        Vous nous écrivez en tant que…
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 max-w-[52ch]">
        Sélectionnez le profil qui vous correspond. Les questions suivantes
        s’adaptent à votre situation pour que nous puissions vous orienter
        plus vite.
      </p>

      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        {AUDIENCES.map(({ value, label, hint, Icon }) => {
          const active = reason === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => onPick(value)}
              className={`group relative flex items-start gap-4 rounded-2xl border p-5 text-left transition-colors ease-premium ${
                active
                  ? 'border-zinc-950 bg-zinc-950 text-stone-50 dark:border-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                  : 'border-stone-200 bg-white text-zinc-900 hover:border-zinc-500 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-100 dark:hover:border-stone-50/40'
              }`}
            >
              <span
                className={`grid place-items-center w-11 h-11 rounded-xl shrink-0 ${
                  active
                    ? 'bg-stone-50/10 text-turf-300 dark:bg-zinc-950/10 dark:text-turf-800'
                    : 'bg-turf-50 text-turf-800 border border-turf-100 dark:bg-turf-800/20 dark:border-turf-300/20 dark:text-turf-300'
                }`}
              >
                <Icon size={20} weight="regular" />
              </span>
              <span>
                <span className="block font-semibold text-base">{label}</span>
                <span className={`block mt-1 text-xs leading-relaxed ${active ? 'text-stone-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-stone-400'}`}>
                  {hint}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Step 2 — Audience-specific forms                                          */
/* -------------------------------------------------------------------------- */

interface StepAudienceFormProps {
  form: ContactForm
  errors: ContactErrors
  onPayloadChange: <K extends keyof ContactForm['payload']>(key: K, value: ContactForm['payload'][K]) => void
  onCvChange: (file: File | null) => void
}

function StepJoueur({ form, errors, onPayloadChange, onCvChange }: StepAudienceFormProps) {
  return (
    <div className="space-y-6">
      <div>
        <FieldLabel htmlFor="pl-intent">Quel est votre objectif ?</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: 'join',   l: 'Rejoindre l’agence' },
            { v: 'renew',  l: 'Prolonger un accompagnement' },
            { v: 'advice', l: 'Un conseil / une orientation' },
            { v: 'other',  l: 'Autre' },
          ].map(({ v, l }) => {
            const active = form.payload.intent === v
            return (
              <button
                key={v}
                type="button"
                onClick={() => onPayloadChange('intent', v as ContactForm['payload']['intent'])}
                className={`px-3 py-2.5 rounded-xl text-sm border transition-colors ease-premium ${
                  active
                    ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                    : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
                }`}
              >
                {l}
              </button>
            )
          })}
        </div>
        <FieldError message={errors['payload.intent']} />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel htmlFor="pl-name">Nom du joueur</FieldLabel>
          <input
            id="pl-name"
            type="text"
            value={form.payload.player_name ?? ''}
            onChange={(e) => onPayloadChange('player_name', e.target.value)}
            className={`${inputBase} ${errors['payload.player_name'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
            placeholder="Prénom Nom"
          />
          <FieldError message={errors['payload.player_name']} />
        </div>
        <div>
          <FieldLabel htmlFor="pl-dob" optional>Date de naissance</FieldLabel>
          <input
            id="pl-dob"
            type="date"
            value={form.payload.date_of_birth ?? ''}
            onChange={(e) => onPayloadChange('date_of_birth', e.target.value)}
            className={`${inputBase} border-stone-300 focus:border-turf-700`}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel htmlFor="pl-position" optional>Poste principal</FieldLabel>
          <input
            id="pl-position"
            type="text"
            value={form.payload.position ?? ''}
            onChange={(e) => onPayloadChange('position', e.target.value)}
            className={`${inputBase} border-stone-300 focus:border-turf-700`}
            placeholder="Attaquant, milieu, défenseur…"
          />
        </div>
        <div>
          <FieldLabel htmlFor="pl-club" optional>Club actuel</FieldLabel>
          <input
            id="pl-club"
            type="text"
            value={form.payload.current_club ?? ''}
            onChange={(e) => onPayloadChange('current_club', e.target.value)}
            className={`${inputBase} border-stone-300 focus:border-turf-700`}
            placeholder="Nom du club"
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="pl-level" optional>Niveau</FieldLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { v: 'youth',    l: 'Jeune / Académie' },
            { v: 'amateur',  l: 'Amateur' },
            { v: 'semi_pro', l: 'Semi-pro' },
            { v: 'pro',      l: 'Professionnel' },
          ].map(({ v, l }) => {
            const active = form.payload.level === v
            return (
              <button
                key={v}
                type="button"
                onClick={() => onPayloadChange('level', v as ContactForm['payload']['level'])}
                className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors ease-premium ${
                  active
                    ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                    : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
                }`}
              >
                {l}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="pl-video" optional>Vidéo / highlights (URL)</FieldLabel>
        <input
          id="pl-video"
          type="url"
          value={form.payload.video_url ?? ''}
          onChange={(e) => onPayloadChange('video_url', e.target.value)}
          className={`${inputBase} ${errors['payload.video_url'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
          placeholder="https://youtu.be/…  ou  drive.google.com/…"
        />
        <FieldError message={errors['payload.video_url']} />
      </div>

      <div>
        <FieldLabel htmlFor="pl-objective" optional>Objectif à moyen terme</FieldLabel>
        <textarea
          id="pl-objective"
          rows={3}
          value={form.payload.objective ?? ''}
          onChange={(e) => onPayloadChange('objective', e.target.value)}
          className={`${inputBase} resize-y min-h-[90px] border-stone-300 focus:border-turf-700`}
          placeholder="Rejoindre une académie européenne, passer pro à 18 ans…"
        />
      </div>

      <div>
        <FieldLabel htmlFor="pl-cv" optional>CV / dossier (PDF, JPG, PNG - 6 Mo max)</FieldLabel>
        <label
          htmlFor="pl-cv"
          className="flex items-center gap-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-50/15 bg-stone-50/60 dark:bg-zinc-900/60 px-4 py-3 text-sm cursor-pointer hover:border-stone-500 dark:hover:border-stone-50/40 transition-colors"
        >
          <PaperclipHorizontal size={16} weight="regular" className="text-zinc-500 dark:text-stone-400" />
          <span className="text-zinc-700 dark:text-stone-300 truncate">
            {form.cv ? form.cv.name : 'Cliquez pour joindre un fichier'}
          </span>
          <input
            id="pl-cv"
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => onCvChange(e.target.files?.[0] ?? null)}
          />
        </label>
        <FieldError message={errors['cv']} />
      </div>
    </div>
  )
}

interface ClubOrMediaProps extends StepAudienceFormProps {
  roster: { id: number; name: string; club?: string | null; position?: string | null }[]
}

function StepClub({ form, errors, onPayloadChange, roster }: ClubOrMediaProps) {
  const interest = form.payload.interest ?? 'player'
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel htmlFor="cl-name">Nom du club</FieldLabel>
          <input
            id="cl-name"
            type="text"
            value={form.payload.club_name ?? ''}
            onChange={(e) => onPayloadChange('club_name', e.target.value)}
            className={`${inputBase} ${errors['payload.club_name'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
            placeholder="Ex : RSC Anderlecht"
          />
          <FieldError message={errors['payload.club_name']} />
        </div>
        <div>
          <FieldLabel htmlFor="cl-role">Votre rôle</FieldLabel>
          <select
            id="cl-role"
            value={form.payload.role ?? ''}
            onChange={(e) => onPayloadChange('role', e.target.value as ContactForm['payload']['role'])}
            className={`${inputBase} ${errors['payload.role'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
          >
            <option value="">Choisir…</option>
            <option value="coach">Entraîneur</option>
            <option value="sporting_director">Directeur sportif</option>
            <option value="scout">Scout / Recruteur</option>
            <option value="president">Président</option>
            <option value="other">Autre</option>
          </select>
          <FieldError message={errors['payload.role']} />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="cl-interest">Objet de votre demande</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: 'player',      l: 'Intérêt pour un joueur' },
            { v: 'profile',     l: 'Recherche d’un profil' },
            { v: 'partnership', l: 'Partenariat / collaboration' },
            { v: 'other',       l: 'Autre' },
          ].map(({ v, l }) => {
            const active = interest === v
            return (
              <button
                key={v}
                type="button"
                onClick={() => onPayloadChange('interest', v as ContactForm['payload']['interest'])}
                className={`px-3 py-2.5 rounded-xl text-sm border transition-colors ease-premium ${
                  active
                    ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                    : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
                }`}
              >
                {l}
              </button>
            )
          })}
        </div>
        <FieldError message={errors['payload.interest']} />
      </div>

      {/* Conditional sub-forms per interest */}
      {interest === 'player' && (
        <div className="space-y-5 rounded-2xl border border-stone-200 dark:border-stone-50/10 p-5 bg-stone-50/40 dark:bg-zinc-950/40">
          <div>
            <FieldLabel htmlFor="cl-player">Joueur ciblé</FieldLabel>
            <select
              id="cl-player"
              value={form.payload.player_id ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value)
                onPayloadChange('player_id', v)
              }}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
            >
              <option value="">Un joueur du roster…</option>
              {roster.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.position ? ` · ${p.position}` : ''}{p.club ? ` · ${p.club}` : ''}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-zinc-500 dark:text-stone-500">
              Le joueur ne figure pas dans la liste ? Précisez son nom ci-dessous.
            </p>
          </div>
          <div>
            <FieldLabel htmlFor="cl-player-name" optional>Autre joueur (nom libre)</FieldLabel>
            <input
              id="cl-player-name"
              type="text"
              value={form.payload.player_name ?? ''}
              onChange={(e) => onPayloadChange('player_name', e.target.value)}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
              placeholder="Nom du joueur non listé"
            />
          </div>
        </div>
      )}

      {interest === 'profile' && (
        <div className="grid sm:grid-cols-3 gap-4 rounded-2xl border border-stone-200 dark:border-stone-50/10 p-5 bg-stone-50/40 dark:bg-zinc-950/40">
          <div className="sm:col-span-1">
            <FieldLabel htmlFor="cl-need-pos">Poste recherché</FieldLabel>
            <input
              id="cl-need-pos"
              type="text"
              value={form.payload.needed_position ?? ''}
              onChange={(e) => onPayloadChange('needed_position', e.target.value)}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
              placeholder="Ex : Ailier gauche"
            />
          </div>
          <div>
            <FieldLabel htmlFor="cl-age-min" optional>Âge min</FieldLabel>
            <input
              id="cl-age-min"
              type="number" min={12} max={45}
              value={form.payload.age_min ?? ''}
              onChange={(e) => onPayloadChange('age_min', e.target.value === '' ? null : Number(e.target.value))}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
            />
          </div>
          <div>
            <FieldLabel htmlFor="cl-age-max" optional>Âge max</FieldLabel>
            <input
              id="cl-age-max"
              type="number" min={12} max={45}
              value={form.payload.age_max ?? ''}
              onChange={(e) => onPayloadChange('age_max', e.target.value === '' ? null : Number(e.target.value))}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
            />
          </div>
          <div className="sm:col-span-3">
            <FieldLabel htmlFor="cl-budget" optional>Budget / cadre financier</FieldLabel>
            <input
              id="cl-budget"
              type="text"
              value={form.payload.budget ?? ''}
              onChange={(e) => onPayloadChange('budget', e.target.value)}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
              placeholder="Ex : 100-250k€ / an, ou libre à négocier"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function StepMedias({ form, errors, onPayloadChange, roster }: ClubOrMediaProps) {
  const wantsPlayer = form.payload.purpose === 'interview_player'
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel htmlFor="md-name">Nom du média</FieldLabel>
          <input
            id="md-name"
            type="text"
            value={form.payload.media_name ?? ''}
            onChange={(e) => onPayloadChange('media_name', e.target.value)}
            className={`${inputBase} ${errors['payload.media_name'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
            placeholder="Ex : L’Équipe, RTL, DAZN…"
          />
          <FieldError message={errors['payload.media_name']} />
        </div>
        <div>
          <FieldLabel htmlFor="md-role">Votre rôle</FieldLabel>
          <select
            id="md-role"
            value={form.payload.role ?? ''}
            onChange={(e) => onPayloadChange('role', e.target.value as ContactForm['payload']['role'])}
            className={`${inputBase} ${errors['payload.role'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
          >
            <option value="">Choisir…</option>
            <option value="journalist">Journaliste</option>
            <option value="editor">Rédacteur en chef</option>
            <option value="producer">Producteur / Réalisateur</option>
            <option value="other">Autre</option>
          </select>
          <FieldError message={errors['payload.role']} />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="md-purpose">Objet de la demande</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: 'interview_player', l: 'Interview d’un joueur' },
            { v: 'article',          l: 'Article / dossier' },
            { v: 'documentary',      l: 'Documentaire' },
            { v: 'other',            l: 'Autre' },
          ].map(({ v, l }) => {
            const active = form.payload.purpose === v
            return (
              <button
                key={v}
                type="button"
                onClick={() => onPayloadChange('purpose', v as ContactForm['payload']['purpose'])}
                className={`px-3 py-2.5 rounded-xl text-sm border transition-colors ease-premium ${
                  active
                    ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                    : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
                }`}
              >
                {l}
              </button>
            )
          })}
        </div>
        <FieldError message={errors['payload.purpose']} />
      </div>

      {wantsPlayer && (
        <div className="space-y-4 rounded-2xl border border-stone-200 dark:border-stone-50/10 p-5 bg-stone-50/40 dark:bg-zinc-950/40">
          <div>
            <FieldLabel htmlFor="md-player">Joueur souhaité</FieldLabel>
            <select
              id="md-player"
              value={form.payload.player_id ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value)
                onPayloadChange('player_id', v)
              }}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
            >
              <option value="">Un joueur du roster…</option>
              {roster.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.position ? ` · ${p.position}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="md-player-name" optional>Autre joueur (nom libre)</FieldLabel>
            <input
              id="md-player-name"
              type="text"
              value={form.payload.player_name ?? ''}
              onChange={(e) => onPayloadChange('player_name', e.target.value)}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
              placeholder="Ex : joueur non représenté par nous"
            />
          </div>
        </div>
      )}

      <div>
        <FieldLabel htmlFor="md-deadline" optional>Deadline de bouclage</FieldLabel>
        <input
          id="md-deadline"
          type="date"
          value={form.payload.deadline ?? ''}
          onChange={(e) => onPayloadChange('deadline', e.target.value)}
          className={`${inputBase} border-stone-300 focus:border-turf-700 max-w-[240px]`}
        />
      </div>
    </div>
  )
}

function StepAutre({ form, errors, onPayloadChange }: StepAudienceFormProps) {
  return (
    <div>
      <FieldLabel htmlFor="ot-subject">Sujet de votre demande</FieldLabel>
      <input
        id="ot-subject"
        type="text"
        value={form.payload.subject ?? ''}
        onChange={(e) => onPayloadChange('subject', e.target.value)}
        className={`${inputBase} ${errors['payload.subject'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
        placeholder="Résumez votre demande en une ligne"
      />
      <FieldError message={errors['payload.subject']} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Step 3 — Coordinates + message + consent                                  */
/* -------------------------------------------------------------------------- */

interface StepCoordsProps {
  form: ContactForm
  errors: ContactErrors
  onFieldChange: <K extends keyof ContactForm>(k: K, v: ContactForm[K]) => void
}

function StepCoords({ form, errors, onFieldChange }: StepCoordsProps) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel htmlFor="contact-name">Votre nom</FieldLabel>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            className={`${inputBase} ${errors.name ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
            placeholder="Prénom Nom"
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
            onChange={(e) => onFieldChange('email', e.target.value)}
            className={`${inputBase} ${errors.email ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
            placeholder="vous@example.com"
          />
          <FieldError message={errors.email} />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="contact-phone" optional>Téléphone</FieldLabel>
        <input
          id="contact-phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => onFieldChange('phone', e.target.value)}
          className={`${inputBase} border-stone-300 focus:border-turf-700`}
          placeholder="+352 661 24 18 47"
        />
      </div>

      <div>
        <FieldLabel htmlFor="contact-message">Votre message</FieldLabel>
        <textarea
          id="contact-message"
          rows={6}
          value={form.message}
          onChange={(e) => onFieldChange('message', e.target.value)}
          className={`${inputBase} resize-y min-h-[140px] ${errors.message ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
          placeholder="Détaillez votre demande. Plus c'est précis, mieux nous pourrons vous orienter."
        />
        <FieldError message={errors.message} />
      </div>

      <label
        className={`mt-2 flex gap-3 items-start cursor-pointer rounded-xl border p-4 transition ${
          errors.consent
            ? 'border-rose-300 bg-rose-50/40 dark:border-rose-500/40 dark:bg-rose-500/10'
            : 'border-stone-200 hover:border-stone-300 dark:border-stone-50/10 dark:hover:border-stone-50/25'
        }`}
      >
        <input
          id="contact-consent"
          type="checkbox"
          checked={form.consent}
          onChange={(e) => onFieldChange('consent', e.target.checked as ContactForm['consent'])}
          className="mt-0.5 w-4 h-4 rounded border-stone-300 text-turf-800 focus:ring-turf-700/30 accent-turf-800 dark:accent-turf-300"
        />
        <span className="text-sm text-zinc-700 dark:text-stone-300 leading-relaxed">
          J'accepte que mes données soient utilisées par Rene Football pour
          traiter ma demande.
          <br />
          <Link to="/confidentialite" className="text-turf-800 dark:text-turf-300 underline underline-offset-2">
            Politique de confidentialité
          </Link>
          <span className="text-zinc-500 dark:text-stone-500"> · Vos données ne sont jamais transmises à des tiers.</span>
        </span>
      </label>
      <FieldError message={errors.consent} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main wizard                                                               */
/* -------------------------------------------------------------------------- */

const STEP_LABELS: Record<number, string> = {
  1: 'Profil',
  2: 'Détails',
  3: 'Coordonnées',
}

function ContactPage() {
  useDarkHero()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState<ContactForm>(emptyForm)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<ContactStatus>(null)

  const { players } = usePublicPlayers()
  const roster = useMemo(() =>
    players.map((p) => ({ id: p.id, name: p.name, club: p.club, position: p.position })),
  [players])

  const setField = <K extends keyof ContactForm>(k: K, v: ContactForm[K]) => {
    setForm((prev) => ({ ...prev, [k]: v } as ContactForm))
    if (errors[k as string]) setErrors((prev) => ({ ...prev, [k]: '' }))
  }

  const setPayload = <K extends keyof ContactForm['payload']>(k: K, v: ContactForm['payload'][K]) => {
    setForm((prev) => ({ ...prev, payload: { ...prev.payload, [k]: v } }))
    if (errors[`payload.${k as string}`]) {
      setErrors((prev) => ({ ...prev, [`payload.${k as string}`]: '' }))
    }
  }

  const validateStep2 = (): ContactErrors => {
    const e: ContactErrors = {}
    const p = form.payload
    if (form.reason === 'joueur') {
      if (!p.intent) e['payload.intent'] = 'Choisissez un objectif.'
      if (!p.player_name || p.player_name.trim().length < 2) e['payload.player_name'] = 'Indiquez le nom du joueur.'
      if (p.video_url && !/^https?:\/\//i.test(p.video_url)) e['payload.video_url'] = 'URL invalide.'
    } else if (form.reason === 'club') {
      if (!p.club_name || p.club_name.trim().length < 2) e['payload.club_name'] = 'Indiquez le nom du club.'
      if (!p.role) e['payload.role'] = 'Précisez votre rôle.'
      if (!p.interest) e['payload.interest'] = 'Sélectionnez l’objet.'
    } else if (form.reason === 'medias') {
      if (!p.media_name || p.media_name.trim().length < 2) e['payload.media_name'] = 'Indiquez le nom du média.'
      if (!p.role) e['payload.role'] = 'Précisez votre rôle.'
      if (!p.purpose) e['payload.purpose'] = 'Sélectionnez l’objet.'
    } else {
      if (!p.subject || p.subject.trim().length < 3) e['payload.subject'] = 'Résumez votre demande.'
    }
    return e
  }

  const validateStep3 = (): ContactErrors => {
    const e: ContactErrors = {}
    if (!form.name || form.name.trim().length < 2) e.name = 'Indiquez votre nom complet.'
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Adresse email invalide.'
    if (!form.message || form.message.trim().length < 10) e.message = 'Détaillez votre demande (10 caractères min).'
    if (!form.consent) e.consent = 'Vous devez accepter le traitement de vos données.'
    return e
  }

  const goNext = () => {
    if (step === 1) {
      setStep(2)
      return
    }
    if (step === 2) {
      const e = validateStep2()
      if (Object.keys(e).length) { setErrors(e); return }
      setErrors({})
      setStep(3)
      return
    }
  }

  const goBack = () => {
    setErrors({})
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step !== 3) { goNext(); return }

    const e = validateStep3()
    if (Object.keys(e).length) { setErrors(e); return }

    setSubmitting(true)
    setStatus(null)

    try {
      // FormData so we can attach the optional CV upload uniformly. Nested
      // payload keys go as payload[foo]=... which Laravel parses back into
      // a nested array.
      const fd = new FormData()
      fd.append('reason', form.reason)
      fd.append('name', form.name)
      fd.append('email', form.email)
      if (form.phone) fd.append('phone', form.phone)
      fd.append('message', form.message)
      fd.append('consent', form.consent ? '1' : '0')
      Object.entries(form.payload).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return
        fd.append(`payload[${k}]`, String(v))
      })
      if (form.cv) fd.append('cv', form.cv)

      await api.post('/contact', fd)
      setStatus('success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const data = err.data as { errors?: Record<string, string[] | string> } | null
        if (err.status === 422 && data?.errors) {
          const serverErrors: ContactErrors = {}
          for (const [k, msgs] of Object.entries(data.errors)) {
            serverErrors[k] = Array.isArray(msgs) ? String(msgs[0]) : String(msgs)
          }
          setErrors(serverErrors)
          // Bounce back to step 2 if any payload key errored, else stay on 3.
          if (Object.keys(serverErrors).some((k) => k.startsWith('payload.'))) setStep(2)
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

  if (status === 'success') return <SuccessScreen reason={form.reason} onReset={() => { setForm(emptyForm); setStep(1); setStatus(null) }} />

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden text-stone-100">
        <MeshGradient intensity="medium" />
        <div className="container-page pt-16 pb-10 lg:pt-24 lg:pb-14">
          <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
            Prendre contact
          </span>
          <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest leading-[1.05] text-stone-50 max-w-[20ch]">
            Échangeons sur votre projet.
          </h1>
          <p className="mt-6 max-w-[58ch] text-base lg:text-lg text-stone-400 leading-relaxed">
            Joueur, famille, club professionnel ou journaliste : quelques
            questions ciblées, et notre équipe revient vers vous sous 48
            heures. Échange confidentiel, sans engagement.
          </p>
        </div>
      </section>

      <section className="bg-stone-50 dark:bg-zinc-950 py-14 lg:py-20">
        <div className="container-page grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* WIZARD */}
          <form
            noValidate
            onSubmit={handleSubmit}
            className="lg:col-span-7 rounded-3xl bg-white border border-stone-200/80 dark:bg-zinc-900 dark:border-stone-50/10 p-6 sm:p-8 lg:p-10 shadow-diffusion"
          >
            <ProgressBar step={step} reason={form.reason} />

            {status === 'error' && (
              <ErrorBanner message="L'envoi a échoué. Réessayez dans un instant ou écrivez-nous à contact@renefootball.com." />
            )}
            {status === 'throttled' && (
              <ErrorBanner tone="warning" message="Trop de demandes envoyées. Patientez une minute avant de réessayer." />
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="mt-8"
              >
                {step === 1 && (
                  <StepAudience reason={form.reason} onPick={(r) => { setField('reason', r); setForm((prev) => ({ ...prev, reason: r, payload: {} })) }} />
                )}
                {step === 2 && form.reason === 'joueur' && (
                  <StepJoueur form={form} errors={errors} onPayloadChange={setPayload} onCvChange={(f) => setField('cv', f)} />
                )}
                {step === 2 && form.reason === 'club' && (
                  <StepClub form={form} errors={errors} onPayloadChange={setPayload} onCvChange={() => {}} roster={roster} />
                )}
                {step === 2 && form.reason === 'medias' && (
                  <StepMedias form={form} errors={errors} onPayloadChange={setPayload} onCvChange={() => {}} roster={roster} />
                )}
                {step === 2 && form.reason === 'autre' && (
                  <StepAutre form={form} errors={errors} onPayloadChange={setPayload} onCvChange={() => {}} />
                )}
                {step === 3 && (
                  <StepCoords form={form} errors={errors} onFieldChange={setField} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            <div className="mt-10 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 1}
                className="btn btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={15} weight="bold" />
                Retour
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="btn btn-primary text-sm"
                >
                  Continuer
                  <ArrowRight size={15} weight="bold" />
                </button>
              ) : (
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
                      Envoi…
                    </>
                  ) : (
                    <>Envoyer ma demande<ArrowRight size={15} weight="bold" /></>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Sidebar */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="rounded-3xl bg-zinc-950 text-stone-100 p-6 lg:p-8 relative overflow-hidden">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -right-12 w-72 h-72 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(30, 64, 175,0.4), transparent 70%)' }}
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
                    <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400">Email</div>
                    <a href="mailto:contact@renefootball.com" className="text-stone-100 hover:text-stone-50 transition">
                      contact@renefootball.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-stone-50/5 border border-stone-50/10 text-turf-300 shrink-0">
                    <Phone size={16} weight="regular" />
                  </span>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400">Téléphone</div>
                    <a href="tel:+352661241847" className="font-mono text-stone-100 hover:text-stone-50 transition tabular-nums">
                      +352 661 24 18 47
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-stone-50/5 border border-stone-50/10 text-turf-300 shrink-0">
                    <MapPin size={16} weight="regular" />
                  </span>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400">Bureau</div>
                    <div className="text-stone-100">Luxembourg-Ville · Luxembourg</div>
                    <div className="text-xs text-stone-400 mt-0.5">Sur rendez-vous uniquement.</div>
                  </div>
                </li>
              </ul>
              <div className="mt-10 pt-6 border-t border-stone-50/10">
                <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400 mb-2">Délai de réponse</div>
                <div className="font-mono text-2xl tabular-nums text-stone-50">
                  48<span className="text-stone-400 text-lg ml-1">h</span>
                </div>
                <p className="text-xs text-stone-400 mt-1.5">Lundi à vendredi, hors jours fériés.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Ancillary components                                                      */
/* -------------------------------------------------------------------------- */

function ProgressBar({ step, reason }: { step: 1 | 2 | 3; reason: ContactReason }) {
  return (
    <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.22em] font-mono text-zinc-500 dark:text-stone-500">
      {[1, 2, 3].map((n) => {
        const active = step === n
        const done = step > n
        return (
          <div key={n} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[0.6rem] font-semibold transition-colors ${
                active
                  ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                  : done
                    ? 'bg-turf-500 text-stone-50'
                    : 'bg-stone-200 text-zinc-500 dark:bg-stone-50/10 dark:text-stone-400'
              }`}
            >
              {done ? '✓' : n}
            </span>
            <span className={active ? 'text-zinc-900 dark:text-stone-100' : ''}>
              {STEP_LABELS[n]}
              {n === 1 && step >= 2 ? ` · ${labelForReason(reason)}` : ''}
            </span>
            {n < 3 && <span aria-hidden="true" className="w-6 h-px bg-stone-300 dark:bg-stone-50/15" />}
          </div>
        )
      })}
    </div>
  )
}

function ErrorBanner({ message, tone = 'error' }: { message: string; tone?: 'error' | 'warning' }) {
  const isError = tone === 'error'
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
        isError
          ? 'border-rose-200 bg-rose-50/60 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
          : 'border-amber-200 bg-amber-50/60 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
      }`}
      role="alert"
    >
      <Warning size={18} weight="regular" className="mt-0.5 shrink-0" />
      <div>{message}</div>
    </motion.div>
  )
}

function SuccessScreen({ reason, onReset }: { reason: ContactReason; onReset: () => void }) {
  return (
    <section className="bg-stone-50 dark:bg-zinc-950 min-h-[80vh] py-24 lg:py-32">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 110, damping: 20 }}
          className="max-w-[60ch]"
        >
          <div className="grid place-items-center w-14 h-14 rounded-2xl bg-turf-50 border border-turf-100 text-turf-800 dark:bg-turf-500/15 dark:border-turf-300/30 dark:text-turf-300">
            <CheckCircle size={26} weight="regular" />
          </div>
          <span className="font-mono uppercase tracking-[0.2em] text-xs text-turf-700 dark:text-turf-300 mt-8 inline-block">
            Demande envoyée
          </span>
          <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest text-zinc-950 dark:text-stone-50 leading-[1.05]">
            Nous reviendrons vers vous sous 48 heures.
          </h1>
          <p className="mt-6 text-base lg:text-lg text-zinc-600 dark:text-stone-400 leading-relaxed">
            Votre dossier <span className="font-semibold">{labelForReason(reason).toLowerCase()}</span> est arrivé
            dans notre boîte. Notre équipe traite chaque demande personnellement -
            nous priorisons selon l'urgence et le profil.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <button type="button" onClick={onReset} className="btn btn-outline text-sm">
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

export default ContactPage
