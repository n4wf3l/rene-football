import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CheckCircle,
  EnvelopeSimple,
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  MapPin,
  MegaphoneSimple,
  PaperclipHorizontal,
  Phone,
  Question,
  SoccerBall,
  TiktokLogo,
  Warning,
  XLogo,
  YoutubeLogo,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { ApiError, api } from '../api/client'
import MeshGradient from '../components/MeshGradient'
import Seo from '../components/Seo'
import { useAppSettings } from '../lib/useAppSettings'
import type { SocialPlatform } from '../types/settings'

const CONTACT_SOCIAL_META: Array<{ key: SocialPlatform; Icon: PhosphorIcon; label: string }> = [
  { key: 'instagram', Icon: InstagramLogo, label: 'Instagram' },
  { key: 'facebook',  Icon: FacebookLogo,  label: 'Facebook'  },
  { key: 'linkedin',  Icon: LinkedinLogo,  label: 'LinkedIn'  },
  { key: 'youtube',   Icon: YoutubeLogo,   label: 'YouTube'   },
  { key: 'tiktok',    Icon: TiktokLogo,    label: 'TikTok'    },
  { key: 'x',         Icon: XLogo,         label: 'X'         },
]
import Select from '../components/ui/Select'
import DateInput from '../components/ui/DateInput'
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
  /** i18n key stem (`contact.audience.<stem>.label` / `.hint`) resolved at render time. */
  i18nKey: 'player' | 'club' | 'media' | 'other'
  Icon: typeof SoccerBall
}

const AUDIENCES: AudienceOption[] = [
  { value: 'joueur',  i18nKey: 'player', Icon: SoccerBall },
  { value: 'club',    i18nKey: 'club',   Icon: Buildings },
  { value: 'medias',  i18nKey: 'media',  Icon: MegaphoneSimple },
  { value: 'autre',   i18nKey: 'other',  Icon: Question },
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
  guardian_consent: false,
  payload: {},
  cv: null,
}

/** Resolve the display label for a ContactReason using the active i18n
 *  language. Callers pass their `t` (from useTranslation) so the same helper
 *  works inside hooks and event handlers. */
function labelForReason(r: ContactReason, t: (key: string) => string): string {
  const audience = AUDIENCES.find((a) => a.value === r)
  if (!audience) return r
  return t(`contact.audience.${audience.i18nKey}.label`)
}

/* -------------------------------------------------------------------------- */
/*  Reusable field primitives                                                 */
/* -------------------------------------------------------------------------- */

// `text-base sm:text-sm` = 16px on mobile, 14px from tablet up. The mobile
// 16px is deliberate: iOS Safari auto-zooms the page whenever the focused
// input's font-size is < 16px, which breaks the layout on every field tap.
// From sm+, viewports aren't affected by the zoom-on-focus behaviour, so we
// go back to the compact 14px for visual density.
const inputBase =
  'w-full rounded-xl border bg-white text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:border-stone-50/15 dark:focus:border-turf-300 px-4 py-3 text-base sm:text-sm transition focus:outline-none focus:ring-2 focus:ring-turf-700/20 dark:focus:ring-turf-300/20'

function FieldLabel({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: boolean }) {
  const { t } = useTranslation()
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-900 dark:text-stone-100 mb-2">
      {children}
      {optional && <span className="ml-2 font-normal text-zinc-400 dark:text-stone-500 text-xs">{t('contact.fieldLabel.optional')}</span>}
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
  const { t } = useTranslation()
  return (
    <div>
      <h2 className="font-display font-semibold text-2xl lg:text-3xl tracking-tight text-zinc-950 dark:text-stone-50">
        {t('contact.audience.title')}
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 max-w-[52ch]">
        {t('contact.audience.subtitle')}
      </p>

      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        {AUDIENCES.map(({ value, i18nKey, Icon }) => {
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
                <span className="block font-semibold text-base">{t(`contact.audience.${i18nKey}.label`)}</span>
                <span className={`block mt-1 text-xs leading-relaxed ${active ? 'text-stone-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-stone-400'}`}>
                  {t(`contact.audience.${i18nKey}.hint`)}
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
  const { t } = useTranslation()
  const intentOptions: Array<{ v: NonNullable<ContactForm['payload']['intent']>; l: string }> = [
    { v: 'join',   l: t('contact.forms.joueur.intent.options.join') },
    { v: 'renew',  l: t('contact.forms.joueur.intent.options.renew') },
    { v: 'advice', l: t('contact.forms.joueur.intent.options.advice') },
    { v: 'other',  l: t('contact.forms.joueur.intent.options.other') },
  ]
  const levelOptions: Array<{ v: NonNullable<ContactForm['payload']['level']>; l: string }> = [
    { v: 'youth',    l: t('contact.forms.joueur.level.options.youth') },
    { v: 'amateur',  l: t('contact.forms.joueur.level.options.amateur') },
    { v: 'semi_pro', l: t('contact.forms.joueur.level.options.semi_pro') },
    { v: 'pro',      l: t('contact.forms.joueur.level.options.pro') },
  ]
  const submitterOptions: Array<{ v: NonNullable<ContactForm['payload']['submitter_type']>; l: string }> = [
    { v: 'self',     l: t('contact.forms.joueur.submitter.options.self') },
    { v: 'guardian', l: t('contact.forms.joueur.submitter.options.guardian') },
  ]
  const guardianRelationOptions: Array<{ v: NonNullable<ContactForm['payload']['guardian_relation']>; l: string }> = [
    { v: 'parent', l: t('contact.forms.joueur.guardianRelation.options.parent') },
    { v: 'tutor',  l: t('contact.forms.joueur.guardianRelation.options.tutor') },
    { v: 'other',  l: t('contact.forms.joueur.guardianRelation.options.other') },
  ]
  const isGuardian = form.payload.submitter_type === 'guardian'
  const guardianIsOther = form.payload.guardian_relation === 'other'
  return (
    <div className="space-y-6">
      {/* Gate RGPD + protection des mineurs : on force la personne qui remplit
          à se déclarer avant tout. Un mineur ne peut pas soumettre lui-même ;
          seul un parent / tuteur légal peut, et doit s'identifier. */}
      <div>
        <FieldLabel htmlFor="pl-submitter">{t('contact.forms.joueur.submitter.label')}</FieldLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {submitterOptions.map(({ v, l }) => {
            const active = form.payload.submitter_type === v
            return (
              <button
                key={v}
                type="button"
                onClick={() => onPayloadChange('submitter_type', v)}
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
        <p className="mt-2 text-xs text-zinc-500 dark:text-stone-500 leading-relaxed">
          {t('contact.forms.joueur.submitter.helper')}
        </p>
        <FieldError message={errors['payload.submitter_type']} />
      </div>

      {isGuardian && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-300/20 dark:bg-amber-500/5 p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel htmlFor="pl-guardian-relation">{t('contact.forms.joueur.guardianRelation.label')}</FieldLabel>
              <Select
                id="pl-guardian-relation"
                value={form.payload.guardian_relation ?? ''}
                onChange={(v) => onPayloadChange('guardian_relation', (v || undefined) as NonNullable<ContactForm['payload']['guardian_relation']> | undefined)}
                options={guardianRelationOptions.map(({ v, l }) => ({ value: v, label: l }))}
                placeholder={t('contact.forms.joueur.guardianRelation.placeholder')}
                invalid={Boolean(errors['payload.guardian_relation'])}
              />
              <FieldError message={errors['payload.guardian_relation']} />
            </div>
            <div>
              <FieldLabel htmlFor="pl-minor-name">{t('contact.forms.joueur.minorName.label')}</FieldLabel>
              <input
                id="pl-minor-name"
                type="text"
                value={form.payload.minor_name ?? ''}
                onChange={(e) => onPayloadChange('minor_name', e.target.value)}
                className={`${inputBase} ${errors['payload.minor_name'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
                placeholder={t('contact.forms.joueur.minorName.placeholder')}
              />
              <FieldError message={errors['payload.minor_name']} />
            </div>
          </div>
          {guardianIsOther && (
            <div>
              <FieldLabel htmlFor="pl-guardian-other">{t('contact.forms.joueur.guardianRelationOther.label')}</FieldLabel>
              <input
                id="pl-guardian-other"
                type="text"
                value={form.payload.guardian_relation_other ?? ''}
                onChange={(e) => onPayloadChange('guardian_relation_other', e.target.value)}
                className={`${inputBase} ${errors['payload.guardian_relation_other'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
                placeholder={t('contact.forms.joueur.guardianRelationOther.placeholder')}
              />
              <FieldError message={errors['payload.guardian_relation_other']} />
            </div>
          )}
        </div>
      )}

      <div>
        <FieldLabel htmlFor="pl-intent">{t('contact.forms.joueur.intent.label')}</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {intentOptions.map(({ v, l }) => {
            const active = form.payload.intent === v
            return (
              <button
                key={v}
                type="button"
                onClick={() => onPayloadChange('intent', v)}
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
          <FieldLabel htmlFor="pl-name">{t('contact.forms.joueur.playerName.label')}</FieldLabel>
          <input
            id="pl-name"
            type="text"
            value={form.payload.player_name ?? ''}
            onChange={(e) => onPayloadChange('player_name', e.target.value)}
            className={`${inputBase} ${errors['payload.player_name'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
            placeholder={t('contact.forms.joueur.playerName.placeholder')}
          />
          <FieldError message={errors['payload.player_name']} />
        </div>
        <div>
          <FieldLabel htmlFor="pl-dob" optional>{t('contact.forms.joueur.dob.label')}</FieldLabel>
          <DateInput
            id="pl-dob"
            value={form.payload.date_of_birth ?? ''}
            onChange={(v) => onPayloadChange('date_of_birth', v)}
            min="1990-01-01"
            max={new Date().toISOString().slice(0, 10)}
            placeholder={t('contact.forms.joueur.dob.placeholder')}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel htmlFor="pl-position" optional>{t('contact.forms.joueur.position.label')}</FieldLabel>
          <input
            id="pl-position"
            type="text"
            value={form.payload.position ?? ''}
            onChange={(e) => onPayloadChange('position', e.target.value)}
            className={`${inputBase} border-stone-300 focus:border-turf-700`}
            placeholder={t('contact.forms.joueur.position.placeholder')}
          />
        </div>
        <div>
          <FieldLabel htmlFor="pl-club" optional>{t('contact.forms.joueur.club.label')}</FieldLabel>
          <input
            id="pl-club"
            type="text"
            value={form.payload.current_club ?? ''}
            onChange={(e) => onPayloadChange('current_club', e.target.value)}
            className={`${inputBase} border-stone-300 focus:border-turf-700`}
            placeholder={t('contact.forms.joueur.club.placeholder')}
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="pl-level" optional>{t('contact.forms.joueur.level.label')}</FieldLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {levelOptions.map(({ v, l }) => {
            const active = form.payload.level === v
            return (
              <button
                key={v}
                type="button"
                onClick={() => onPayloadChange('level', v)}
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
        <FieldLabel htmlFor="pl-video" optional>{t('contact.forms.joueur.video.label')}</FieldLabel>
        <input
          id="pl-video"
          type="url"
          value={form.payload.video_url ?? ''}
          onChange={(e) => onPayloadChange('video_url', e.target.value)}
          className={`${inputBase} ${errors['payload.video_url'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
          placeholder={t('contact.forms.joueur.video.placeholder')}
        />
        <FieldError message={errors['payload.video_url']} />
      </div>

      <div>
        <FieldLabel htmlFor="pl-objective" optional>{t('contact.forms.joueur.objective.label')}</FieldLabel>
        <textarea
          id="pl-objective"
          rows={3}
          value={form.payload.objective ?? ''}
          onChange={(e) => onPayloadChange('objective', e.target.value)}
          className={`${inputBase} resize-y min-h-[90px] border-stone-300 focus:border-turf-700`}
          placeholder={t('contact.forms.joueur.objective.placeholder')}
        />
      </div>

      <div>
        <FieldLabel htmlFor="pl-cv" optional>{t('contact.forms.joueur.cv.label')}</FieldLabel>
        <label
          htmlFor="pl-cv"
          className="flex items-center gap-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-50/15 bg-stone-50/60 dark:bg-zinc-900/60 px-4 py-3 text-sm cursor-pointer hover:border-stone-500 dark:hover:border-stone-50/40 transition-colors"
        >
          <PaperclipHorizontal size={16} weight="regular" className="text-zinc-500 dark:text-stone-400" />
          <span className="text-zinc-700 dark:text-stone-300 truncate">
            {form.cv ? form.cv.name : t('contact.forms.joueur.cv.placeholder')}
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
  const { t } = useTranslation()
  const interest = form.payload.interest ?? 'player'
  const interestOptions: Array<{ v: NonNullable<ContactForm['payload']['interest']>; l: string }> = [
    { v: 'player',      l: t('contact.forms.club.interest.options.player') },
    { v: 'profile',     l: t('contact.forms.club.interest.options.profile') },
    { v: 'partnership', l: t('contact.forms.club.interest.options.partnership') },
    { v: 'other',       l: t('contact.forms.club.interest.options.other') },
  ]
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel htmlFor="cl-name">{t('contact.forms.club.name.label')}</FieldLabel>
          <input
            id="cl-name"
            type="text"
            value={form.payload.club_name ?? ''}
            onChange={(e) => onPayloadChange('club_name', e.target.value)}
            className={`${inputBase} ${errors['payload.club_name'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
            placeholder={t('contact.forms.club.name.placeholder')}
          />
          <FieldError message={errors['payload.club_name']} />
        </div>
        <div>
          <FieldLabel htmlFor="cl-role">{t('contact.forms.club.role.label')}</FieldLabel>
          <Select
            id="cl-role"
            value={form.payload.role ?? ''}
            onChange={(v) => onPayloadChange('role', v as ContactForm['payload']['role'])}
            invalid={Boolean(errors['payload.role'])}
            placeholder={t('contact.forms.club.role.placeholder')}
            options={[
              { value: 'coach',              label: t('contact.forms.club.role.options.coach') },
              { value: 'sporting_director',  label: t('contact.forms.club.role.options.sporting_director') },
              { value: 'scout',              label: t('contact.forms.club.role.options.scout') },
              { value: 'president',          label: t('contact.forms.club.role.options.president') },
              { value: 'other',              label: t('contact.forms.club.role.options.other') },
            ]}
          />
          <FieldError message={errors['payload.role']} />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="cl-interest">{t('contact.forms.club.interest.label')}</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {interestOptions.map(({ v, l }) => {
            const active = interest === v
            return (
              <button
                key={v}
                type="button"
                onClick={() => onPayloadChange('interest', v)}
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
            <FieldLabel htmlFor="cl-player">{t('contact.forms.club.player.label')}</FieldLabel>
            <Select
              id="cl-player"
              value={form.payload.player_id != null ? String(form.payload.player_id) : ''}
              onChange={(v) => onPayloadChange('player_id', v === '' ? null : Number(v))}
              placeholder={t('contact.forms.club.player.placeholder')}
              emptyLabel={t('contact.forms.club.player.emptyLabel')}
              options={roster.map((p) => ({
                value: String(p.id),
                label: `${p.name}${p.position ? ` · ${p.position}` : ''}${p.club ? ` · ${p.club}` : ''}`,
              }))}
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-stone-500">
              {t('contact.forms.club.player.hint')}
            </p>
          </div>
          <div>
            <FieldLabel htmlFor="cl-player-name" optional>{t('contact.forms.club.otherPlayer.label')}</FieldLabel>
            <input
              id="cl-player-name"
              type="text"
              value={form.payload.player_name ?? ''}
              onChange={(e) => onPayloadChange('player_name', e.target.value)}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
              placeholder={t('contact.forms.club.otherPlayer.placeholder')}
            />
          </div>
        </div>
      )}

      {interest === 'profile' && (
        <div className="grid sm:grid-cols-3 gap-4 rounded-2xl border border-stone-200 dark:border-stone-50/10 p-5 bg-stone-50/40 dark:bg-zinc-950/40">
          <div className="sm:col-span-1">
            <FieldLabel htmlFor="cl-need-pos">{t('contact.forms.club.neededPosition.label')}</FieldLabel>
            <input
              id="cl-need-pos"
              type="text"
              value={form.payload.needed_position ?? ''}
              onChange={(e) => onPayloadChange('needed_position', e.target.value)}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
              placeholder={t('contact.forms.club.neededPosition.placeholder')}
            />
          </div>
          <div>
            <FieldLabel htmlFor="cl-age-min" optional>{t('contact.forms.club.ageMin')}</FieldLabel>
            <input
              id="cl-age-min"
              type="number" min={12} max={45}
              value={form.payload.age_min ?? ''}
              onChange={(e) => onPayloadChange('age_min', e.target.value === '' ? null : Number(e.target.value))}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
            />
          </div>
          <div>
            <FieldLabel htmlFor="cl-age-max" optional>{t('contact.forms.club.ageMax')}</FieldLabel>
            <input
              id="cl-age-max"
              type="number" min={12} max={45}
              value={form.payload.age_max ?? ''}
              onChange={(e) => onPayloadChange('age_max', e.target.value === '' ? null : Number(e.target.value))}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
            />
          </div>
          <div className="sm:col-span-3">
            <FieldLabel htmlFor="cl-budget" optional>{t('contact.forms.club.budget.label')}</FieldLabel>
            <input
              id="cl-budget"
              type="text"
              value={form.payload.budget ?? ''}
              onChange={(e) => onPayloadChange('budget', e.target.value)}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
              placeholder={t('contact.forms.club.budget.placeholder')}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function StepMedias({ form, errors, onPayloadChange, roster }: ClubOrMediaProps) {
  const { t } = useTranslation()
  const wantsPlayer = form.payload.purpose === 'interview_player'
  const purposeOptions: Array<{ v: NonNullable<ContactForm['payload']['purpose']>; l: string }> = [
    { v: 'interview_player', l: t('contact.forms.media.purpose.options.interview_player') },
    { v: 'article',          l: t('contact.forms.media.purpose.options.article') },
    { v: 'documentary',      l: t('contact.forms.media.purpose.options.documentary') },
    { v: 'other',            l: t('contact.forms.media.purpose.options.other') },
  ]
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel htmlFor="md-name">{t('contact.forms.media.name.label')}</FieldLabel>
          <input
            id="md-name"
            type="text"
            value={form.payload.media_name ?? ''}
            onChange={(e) => onPayloadChange('media_name', e.target.value)}
            className={`${inputBase} ${errors['payload.media_name'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
            placeholder={t('contact.forms.media.name.placeholder')}
          />
          <FieldError message={errors['payload.media_name']} />
        </div>
        <div>
          <FieldLabel htmlFor="md-role">{t('contact.forms.media.role.label')}</FieldLabel>
          <Select
            id="md-role"
            value={form.payload.role ?? ''}
            onChange={(v) => onPayloadChange('role', v as ContactForm['payload']['role'])}
            invalid={Boolean(errors['payload.role'])}
            placeholder={t('contact.forms.media.role.placeholder')}
            options={[
              { value: 'journalist', label: t('contact.forms.media.role.options.journalist') },
              { value: 'editor',     label: t('contact.forms.media.role.options.editor') },
              { value: 'producer',   label: t('contact.forms.media.role.options.producer') },
              { value: 'other',      label: t('contact.forms.media.role.options.other') },
            ]}
          />
          <FieldError message={errors['payload.role']} />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="md-purpose">{t('contact.forms.media.purpose.label')}</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {purposeOptions.map(({ v, l }) => {
            const active = form.payload.purpose === v
            return (
              <button
                key={v}
                type="button"
                onClick={() => onPayloadChange('purpose', v)}
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
            <FieldLabel htmlFor="md-player">{t('contact.forms.media.player.label')}</FieldLabel>
            <Select
              id="md-player"
              value={form.payload.player_id != null ? String(form.payload.player_id) : ''}
              onChange={(v) => onPayloadChange('player_id', v === '' ? null : Number(v))}
              placeholder={t('contact.forms.media.player.placeholder')}
              emptyLabel={t('contact.forms.media.player.emptyLabel')}
              options={roster.map((p) => ({
                value: String(p.id),
                label: `${p.name}${p.position ? ` · ${p.position}` : ''}`,
              }))}
            />
          </div>
          <div>
            <FieldLabel htmlFor="md-player-name" optional>{t('contact.forms.media.otherPlayer.label')}</FieldLabel>
            <input
              id="md-player-name"
              type="text"
              value={form.payload.player_name ?? ''}
              onChange={(e) => onPayloadChange('player_name', e.target.value)}
              className={`${inputBase} border-stone-300 focus:border-turf-700`}
              placeholder={t('contact.forms.media.otherPlayer.placeholder')}
            />
          </div>
        </div>
      )}

      <div>
        <FieldLabel htmlFor="md-deadline" optional>{t('contact.forms.media.deadline.label')}</FieldLabel>
        <div className="max-w-[280px]">
          <DateInput
            id="md-deadline"
            value={form.payload.deadline ?? ''}
            onChange={(v) => onPayloadChange('deadline', v)}
            min={new Date().toISOString().slice(0, 10)}
            placeholder={t('contact.forms.media.deadline.placeholder')}
          />
        </div>
      </div>
    </div>
  )
}

function StepAutre({ form, errors, onPayloadChange }: StepAudienceFormProps) {
  const { t } = useTranslation()
  return (
    <div>
      <FieldLabel htmlFor="ot-subject">{t('contact.forms.autre.subject.label')}</FieldLabel>
      <input
        id="ot-subject"
        type="text"
        value={form.payload.subject ?? ''}
        onChange={(e) => onPayloadChange('subject', e.target.value)}
        className={`${inputBase} ${errors['payload.subject'] ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
        placeholder={t('contact.forms.autre.subject.placeholder')}
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
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel htmlFor="contact-name">{t('contact.forms.coords.name.label')}</FieldLabel>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            className={`${inputBase} ${errors.name ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
            placeholder={t('contact.forms.coords.name.placeholder')}
          />
          <FieldError message={errors.name} />
        </div>
        <div>
          <FieldLabel htmlFor="contact-email">{t('contact.forms.coords.email.label')}</FieldLabel>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => onFieldChange('email', e.target.value)}
            className={`${inputBase} ${errors.email ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
            placeholder={t('contact.forms.coords.email.placeholder')}
          />
          <FieldError message={errors.email} />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="contact-phone" optional>{t('contact.forms.coords.phone.label')}</FieldLabel>
        <input
          id="contact-phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => onFieldChange('phone', e.target.value)}
          className={`${inputBase} border-stone-300 focus:border-turf-700`}
          placeholder={t('contact.forms.coords.phone.placeholder')}
        />
      </div>

      <div>
        <FieldLabel htmlFor="contact-message">{t('contact.forms.coords.message.label')}</FieldLabel>
        <textarea
          id="contact-message"
          rows={6}
          value={form.message}
          onChange={(e) => onFieldChange('message', e.target.value)}
          className={`${inputBase} resize-y min-h-[140px] ${errors.message ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700'}`}
          placeholder={t('contact.forms.coords.message.placeholder')}
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
          {t('contact.consent.text')}
          <br />
          <Link to="/confidentialite" className="text-turf-800 dark:text-turf-300 underline underline-offset-2">
            {t('contact.consent.privacyLink')}
          </Link>
          <span className="text-zinc-500 dark:text-stone-500"> · {t('contact.consent.privacyNote')}</span>
        </span>
      </label>
      <FieldError message={errors.consent} />

      {/* Secondary explicit guardian authorisation. Only shown when the
          parcours is "joueur" and the submitter declared themselves as a
          parent/legal guardian — RGPD + child-protection requirement. */}
      {form.reason === 'joueur' && form.payload.submitter_type === 'guardian' && (
        <>
          <label
            className={`flex gap-3 items-start cursor-pointer rounded-xl border p-4 transition ${
              errors.guardian_consent
                ? 'border-rose-300 bg-rose-50/40 dark:border-rose-500/40 dark:bg-rose-500/10'
                : 'border-amber-200 bg-amber-50/50 hover:border-amber-300 dark:border-amber-300/20 dark:bg-amber-500/5 dark:hover:border-amber-300/40'
            }`}
          >
            <input
              id="contact-guardian-consent"
              type="checkbox"
              checked={form.guardian_consent}
              onChange={(e) => onFieldChange('guardian_consent', e.target.checked as ContactForm['guardian_consent'])}
              className="mt-0.5 w-4 h-4 rounded border-stone-300 text-turf-800 focus:ring-turf-700/30 accent-turf-800 dark:accent-turf-300"
            />
            <span className="text-sm text-zinc-700 dark:text-stone-300 leading-relaxed">
              {t('contact.consent.guardianText')}
            </span>
          </label>
          <FieldError message={errors.guardian_consent} />
        </>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main wizard                                                               */
/* -------------------------------------------------------------------------- */

const STEP_LABEL_KEYS: Record<number, 'contact.steps.profile' | 'contact.steps.details' | 'contact.steps.coordinates'> = {
  1: 'contact.steps.profile',
  2: 'contact.steps.details',
  3: 'contact.steps.coordinates',
}

function ContactPage() {
  const { t } = useTranslation()
  useDarkHero()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState<ContactForm>(emptyForm)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<ContactStatus>(null)

  const { players } = usePublicPlayers()
  const { settings } = useAppSettings()
  const contactSocials = CONTACT_SOCIAL_META.filter((s) => Boolean(settings.social_links[s.key]))
  // Soft fallbacks — keep the sidebar + banner coherent even before the
  // admin filled in the Réglages page. Overridden by any value coming from
  // /api/settings as soon as it's saved.
  const agencyEmail = settings.contact.email ?? 'contact@renefootball.com'
  const agencyPhone = settings.contact.phone ?? '+352 691 712 574'
  const agencyCity  = settings.contact.office_city ?? 'Luxembourg-Ville · Luxembourg'
  const agencyTelUri = `tel:${agencyPhone.replace(/[\s()-]/g, '')}`
  const roster = useMemo(() =>
    players.map((p) => ({ id: p.id, name: p.name, club: p.club, position: p.position })),
  [players])

  // Deep-link hydration: /contact?reason=club&player_id=42&interest=player
  // Runs once on mount; pre-fills the wizard and jumps to step 2 so a
  // visitor who arrived from a "Intéressé par ce joueur" CTA doesn't have
  // to re-pick their audience.
  useEffect(() => {
    const reason = searchParams.get('reason')
    const playerId = searchParams.get('player_id')
    const interest = searchParams.get('interest')
    const purpose  = searchParams.get('purpose')

    const validReasons: ContactReason[] = ['joueur', 'club', 'medias', 'autre']
    if (!reason || !validReasons.includes(reason as ContactReason)) return

    setForm((prev) => {
      const payload: ContactForm['payload'] = { ...prev.payload }
      const parsedId = playerId && /^\d+$/.test(playerId) ? Number(playerId) : null
      if (parsedId !== null) payload.player_id = parsedId
      // Club deep-link: player_id implies interest=player unless explicitly overridden.
      if (reason === 'club') {
        if (interest === 'player' || interest === 'profile' || interest === 'partnership' || interest === 'other') {
          payload.interest = interest
        } else if (parsedId !== null) {
          payload.interest = 'player'
        }
      }
      // Media deep-link: player_id implies purpose=interview_player.
      if (reason === 'medias') {
        if (purpose === 'interview_player' || purpose === 'article' || purpose === 'documentary' || purpose === 'other') {
          payload.purpose = purpose
        } else if (parsedId !== null) {
          payload.purpose = 'interview_player'
        }
      }
      return { ...prev, reason: reason as ContactReason, payload }
    })
    setStep(2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      // Gate RGPD/mineurs : qui remplit, et si tuteur → lien + nom du mineur.
      if (!p.submitter_type) e['payload.submitter_type'] = t('contact.validation.submitterType')
      if (p.submitter_type === 'guardian') {
        if (!p.guardian_relation) e['payload.guardian_relation'] = t('contact.validation.guardianRelation')
        if (p.guardian_relation === 'other' && (!p.guardian_relation_other || p.guardian_relation_other.trim().length < 2)) {
          e['payload.guardian_relation_other'] = t('contact.validation.guardianRelationOther')
        }
        if (!p.minor_name || p.minor_name.trim().length < 2) e['payload.minor_name'] = t('contact.validation.minorName')
      }
      if (!p.intent) e['payload.intent'] = t('contact.validation.intent')
      if (!p.player_name || p.player_name.trim().length < 2) e['payload.player_name'] = t('contact.validation.playerName')
      if (p.video_url && !/^https?:\/\//i.test(p.video_url)) e['payload.video_url'] = t('contact.validation.videoUrl')
    } else if (form.reason === 'club') {
      if (!p.club_name || p.club_name.trim().length < 2) e['payload.club_name'] = t('contact.validation.clubName')
      if (!p.role) e['payload.role'] = t('contact.validation.role')
      if (!p.interest) e['payload.interest'] = t('contact.validation.interest')
    } else if (form.reason === 'medias') {
      if (!p.media_name || p.media_name.trim().length < 2) e['payload.media_name'] = t('contact.validation.mediaName')
      if (!p.role) e['payload.role'] = t('contact.validation.role')
      if (!p.purpose) e['payload.purpose'] = t('contact.validation.purpose')
    } else {
      if (!p.subject || p.subject.trim().length < 3) e['payload.subject'] = t('contact.validation.subject')
    }
    return e
  }

  const validateStep3 = (): ContactErrors => {
    const e: ContactErrors = {}
    if (!form.name || form.name.trim().length < 2) e.name = t('contact.validation.contactName')
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('contact.validation.contactEmail')
    if (!form.message || form.message.trim().length < 10) e.message = t('contact.validation.message')
    if (!form.consent) e.consent = t('contact.validation.consent')
    // Secondary guardian authorisation — required when the submitter is a
    // parent/legal guardian submitting a minor's data.
    if (form.reason === 'joueur' && form.payload.submitter_type === 'guardian' && !form.guardian_consent) {
      e.guardian_consent = t('contact.validation.guardianConsent')
    }
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
      // Guardian consent is only meaningful on the joueur-with-guardian path.
      if (form.reason === 'joueur' && form.payload.submitter_type === 'guardian') {
        fd.append('guardian_consent', form.guardian_consent ? '1' : '0')
      }
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
      <Seo
        title={t('nav.contact')}
        description={t('contact.seo.description')}
        path="/contact"
      />
      {/* Hero */}
      <section className="relative overflow-hidden text-stone-100">
        <MeshGradient intensity="medium" />
        <div className="container-page pt-16 pb-10 lg:pt-24 lg:pb-14">
          <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
            {t('contact.hero.eyebrow')}
          </span>
          <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest leading-[1.05] text-stone-50 max-w-[20ch]">
            {t('contact.hero.title')}
          </h1>
          <p className="mt-6 max-w-[58ch] text-base lg:text-lg text-stone-400 leading-relaxed">
            {t('contact.hero.paragraph')}
          </p>
        </div>
      </section>

      <section className="bg-stone-50 dark:bg-zinc-950 py-14 lg:py-20">
        <div className="container-page">
          {/* Pre-launch soft notice : while the agency inbox is being
              provisioned at Hostinger, submissions are still captured in
              the admin dashboard but we want users to have a direct contact
              fallback visible in case of urgency. Non-blocking. */}
          <div className="mb-8 rounded-2xl border border-amber-200/70 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-500/[0.08] p-4 text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
            <div className="font-semibold mb-1">{t('contact.pendingTitle')}</div>
            <div>
              {t('contact.pendingBody')}{' '}
              <a href={`mailto:${agencyEmail}`} className="underline underline-offset-2 font-medium">{agencyEmail}</a>{' '}
              {t('contact.pendingOr')}{' '}
              <a href={agencyTelUri} className="underline underline-offset-2 font-medium font-mono">{agencyPhone}</a>.
            </div>
          </div>
        </div>
        <div className="container-page grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* WIZARD */}
          <form
            noValidate
            onSubmit={handleSubmit}
            className="lg:col-span-7 rounded-3xl bg-white border border-stone-200/80 dark:bg-zinc-900 dark:border-stone-50/10 p-4 sm:p-8 lg:p-10 shadow-diffusion"
          >
            <ProgressBar step={step} reason={form.reason} />

            {status === 'error' && (
              <ErrorBanner message={t('contact.errors.submitFailed')} />
            )}
            {status === 'throttled' && (
              <ErrorBanner tone="warning" message={t('contact.errors.throttled')} />
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

            {/* Nav buttons — the Retour button is hidden entirely on step 1
                (no back to go to) rather than shown greyed out, so the button
                bar doesn't advertise a dead action. An empty spacer keeps the
                Continuer button justified to the right. */}
            <div className="mt-10 flex items-center justify-between gap-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="btn btn-ghost text-sm"
                >
                  <ArrowLeft size={15} weight="bold" />
                  {t('common.back')}
                </button>
              ) : (
                <span aria-hidden="true" />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="btn btn-primary text-sm"
                >
                  {t('common.next')}
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
                      {t('contact.buttons.sending')}
                    </>
                  ) : (
                    <>{t('contact.buttons.submit')}<ArrowRight size={15} weight="bold" /></>
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
                {t('contact.sidebar.eyebrow')}
              </div>
              <h2 className="mt-3 font-display font-semibold text-2xl lg:text-3xl tracking-tight text-stone-50 max-w-[18ch]">
                {t('contact.sidebar.title')}
              </h2>
              <ul className="mt-8 space-y-5">
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-stone-50/5 border border-stone-50/10 text-turf-300 shrink-0">
                    <EnvelopeSimple size={16} weight="regular" />
                  </span>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400">{t('contact.sidebar.email')}</div>
                    <a href={`mailto:${agencyEmail}`} className="text-stone-100 hover:text-stone-50 transition break-all">
                      {agencyEmail}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-stone-50/5 border border-stone-50/10 text-turf-300 shrink-0">
                    <Phone size={16} weight="regular" />
                  </span>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400">{t('contact.sidebar.phone')}</div>
                    <a href={agencyTelUri} className="font-mono text-stone-100 hover:text-stone-50 transition tabular-nums">
                      {agencyPhone}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-stone-50/5 border border-stone-50/10 text-turf-300 shrink-0">
                    <MapPin size={16} weight="regular" />
                  </span>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400">{t('contact.sidebar.office')}</div>
                    <div className="text-stone-100">{agencyCity}</div>
                    <div className="text-xs text-stone-400 mt-0.5">{t('contact.sidebar.officeSubtitle')}</div>
                  </div>
                </li>
              </ul>
              <div className="mt-10 pt-6 border-t border-stone-50/10">
                <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400 mb-2">{t('contact.sidebar.replyDelay')}</div>
                <div className="font-mono text-2xl tabular-nums text-stone-50">
                  48<span className="text-stone-400 text-lg ml-1">h</span>
                </div>
                <p className="text-xs text-stone-400 mt-1.5">{t('contact.sidebar.replyDelayNote')}</p>
              </div>

              {/* Social icons — driven by admin settings, entire row hidden
                  when no URL was set. */}
              {contactSocials.length > 0 && (
                <div className="mt-6 pt-6 border-t border-stone-50/10">
                  <div className="text-[0.65rem] uppercase tracking-wider font-mono text-stone-400 mb-3">{t('contact.sidebar.follow')}</div>
                  <ul className="flex items-center gap-2" aria-label={t('contact.sidebar.follow')}>
                    {contactSocials.map(({ key, Icon, label }) => (
                      <li key={key}>
                        <a
                          href={settings.social_links[key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          title={label}
                          className="grid place-items-center w-9 h-9 rounded-full bg-stone-50/5 border border-stone-50/10 text-turf-300 hover:bg-stone-50/10 hover:text-stone-50 transition-colors ease-premium"
                        >
                          <Icon size={16} weight="regular" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
  const { t } = useTranslation()
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
              {t(STEP_LABEL_KEYS[n])}
              {n === 1 && step >= 2 ? ` · ${labelForReason(reason, t)}` : ''}
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
  const { t } = useTranslation()
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
            {t('contact.success.eyebrow')}
          </span>
          <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest text-zinc-950 dark:text-stone-50 leading-[1.05]">
            {t('contact.success.title')}
          </h1>
          <p className="mt-6 text-base lg:text-lg text-zinc-600 dark:text-stone-400 leading-relaxed">
            {t('contact.success.bodyPre')} <span className="font-semibold">{labelForReason(reason, t).toLowerCase()}</span> {t('contact.success.bodyPost')}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <button type="button" onClick={onReset} className="btn btn-outline text-sm">
              {t('contact.success.resetCta')}
            </button>
            <Link to="/joueurs" className="btn btn-primary text-sm">
              {t('home.hero.ctaPrimary')}
              <ArrowRight size={15} weight="bold" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default ContactPage
