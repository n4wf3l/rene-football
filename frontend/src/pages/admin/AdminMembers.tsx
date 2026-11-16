import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { EnvelopeSimple, PencilSimple, Plus, Trash, X as XIcon } from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { ROLE_LABELS, type AdminRole } from '../../auth/permissions'
import Skeleton from '../../components/Skeleton'
import { useConfirm } from '../../components/ConfirmProvider'
import { useToast } from '../../components/ToastProvider'

/**
 * Back-office members (superadmin only, backend AdminMemberController).
 * A new member receives an email to choose their own password; nobody
 * types or shares a password here.
 */

interface Member {
  id: number
  name: string
  email: string
  role: AdminRole
  invitation_pending: boolean
  created_at: string | null
}

interface MembersResponse { data: Member[] }

const ROLES: AdminRole[] = ['superadmin', 'admin', 'scout', 'analyst']

/** What each role opens, as shown in the legend and the role picker. */
const ROLE_SCOPE: Record<AdminRole, string> = {
  superadmin: 'Tout, et la gestion des membres.',
  admin: 'Le site et l’agence, sans Scouting ni Data analyse.',
  scout: 'Le site, l’agence et le Scouting, sans Data analyse.',
  analyst: 'Le site, l’agence et la Data analyse, sans Scouting.',
}

const INPUT =
  'w-full rounded-lg border border-stone-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300 px-3 py-2 text-sm focus:outline-none transition'
const LABEL = 'block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1'
const ICON_BUTTON =
  'grid place-items-center w-8 h-8 rounded-md text-zinc-500 hover:bg-stone-200/60 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition'

type FormState = { name: string; email: string; role: AdminRole }
type FieldErrors = Partial<Record<keyof FormState, string>>
const EMPTY: FormState = { name: '', email: '', role: 'admin' }

function errorsFrom(err: unknown): { fields: FieldErrors; message: string } {
  const data = err instanceof ApiError
    ? (err.data as { errors?: Record<string, string[]>; message?: string } | null)
    : null
  const fields: FieldErrors = {
    name: data?.errors?.name?.[0],
    email: data?.errors?.email?.[0],
    role: data?.errors?.role?.[0],
  }
  const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
  return { fields, message: first || data?.message || (err instanceof Error ? err.message : 'Enregistrement impossible.') }
}

export default function AdminMembers() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  /** null = form closed, 'new' = adding, a number = editing that member. */
  const [editing, setEditing] = useState<'new' | number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  const reload = () =>
    api.get<MembersResponse>('/admin/members', { auth: true })
      .then((res) => setMembers(res.data))
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Chargement impossible.'))
      .finally(() => setLoading(false))

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, [])

  const openNew = () => { setEditing('new'); setForm(EMPTY); setErrors({}) }
  const openEdit = (m: Member) => { setEditing(m.id); setForm({ name: m.name, email: m.email, role: m.role }); setErrors({}) }
  const closeForm = () => { setEditing(null); setErrors({}) }

  const isMe = (m: Member) => m.id === user?.id

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      if (editing === 'new') {
        const res = await api.post<{ invitation_sent: boolean }>('/admin/members', form, { auth: true })
        if (res.invitation_sent) toast.success(`Membre ajouté. Invitation envoyée à ${form.email}.`)
        else toast.error('Membre ajouté, mais l’e-mail d’invitation n’a pas pu partir. Renvoyez-le depuis la liste.')
      } else if (typeof editing === 'number') {
        const current = members.find((m) => m.id === editing)
        const payload = current && isMe(current) ? { name: form.name, email: form.email } : form
        await api.patch(`/admin/members/${editing}`, payload, { auth: true })
        toast.success('Membre modifié.')
      }
      closeForm()
      await reload()
    } catch (err: unknown) {
      const { fields, message } = errorsFrom(err)
      setErrors(fields)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const changeRole = async (m: Member, role: AdminRole) => {
    if (role === m.role || busy != null) return
    const previous = members
    setBusy(m.id)
    setMembers((list) => list.map((x) => (x.id === m.id ? { ...x, role } : x)))
    try {
      await api.patch(`/admin/members/${m.id}`, { role }, { auth: true })
      toast.success(`${m.name} est maintenant ${ROLE_LABELS[role]}.`)
    } catch (err: unknown) {
      setMembers(previous)
      toast.error(errorsFrom(err).message)
    } finally {
      setBusy(null)
    }
  }

  const resendInvitation = async (m: Member) => {
    if (busy != null) return
    setBusy(m.id)
    try {
      await api.post(`/admin/members/${m.id}/invitation`, {}, { auth: true })
      toast.success(`Nouvelle invitation envoyée à ${m.email}.`)
    } catch (err: unknown) {
      toast.error(errorsFrom(err).message)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (m: Member) => {
    if (!(await confirm({
      title: `Supprimer le compte de « ${m.name} » ?`,
      body: 'Ce membre ne pourra plus se connecter. Ses rapports et contributions restent dans la plateforme, sans son nom. Son espace scout personnel est supprimé. Cette action est définitive.',
      confirmLabel: 'Supprimer',
      danger: true,
    }))) return
    setBusy(m.id)
    try {
      await api.delete(`/admin/members/${m.id}`, { auth: true })
      setMembers((list) => list.filter((x) => x.id !== m.id))
      toast.success('Membre supprimé.')
    } catch (err: unknown) {
      toast.error(errorsFrom(err).message)
    } finally {
      setBusy(null)
    }
  }

  const editingMe = typeof editing === 'number' && editing === user?.id

  return (
    <div className="px-6 lg:px-10 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow">Agence</span>
          <h1 className="mt-2 font-display font-semibold text-3xl lg:text-4xl tracking-tight text-zinc-950 dark:text-stone-50">
            Membres
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-stone-400">
            Les comptes qui ont accès à cet espace, et ce que chaque rôle peut ouvrir.
          </p>
        </div>
        {editing === null && (
          <button type="button" onClick={openNew} className="btn btn-primary text-sm inline-flex items-center gap-1.5">
            <Plus size={14} weight="bold" /> Nouveau membre
          </button>
        )}
      </div>

      {editing !== null && (
        <form onSubmit={submit} className="mb-8 rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50">
              {editing === 'new' ? 'Nouveau membre' : `Modifier « ${form.name} »`}
            </h2>
            <button type="button" onClick={closeForm} aria-label="Annuler" className="grid place-items-center w-8 h-8 rounded-full text-zinc-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-50/10 transition">
              <XIcon size={16} weight="bold" />
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className={LABEL}>Nom *</span>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={INPUT} required maxLength={120} autoFocus />
              {errors.name && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors.name}</span>}
            </label>
            <label className="block">
              <span className={LABEL}>E-mail *</span>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={INPUT} required maxLength={190} />
              {errors.email && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors.email}</span>}
            </label>
            <label className="block">
              <span className={LABEL}>Rôle *</span>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminRole }))}
                className={INPUT}
                disabled={editingMe}
              >
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <span className="mt-1 block text-[0.7rem] text-zinc-500 dark:text-stone-400">
                {editingMe ? 'Vous ne pouvez pas changer votre propre rôle.' : ROLE_SCOPE[form.role]}
              </span>
              {errors.role && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors.role}</span>}
            </label>
          </div>

          {editing === 'new' && (
            <p className="text-xs text-zinc-500 dark:text-stone-400">
              Le membre reçoit un e-mail pour choisir son mot de passe (lien valable 72 heures).
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={closeForm} className="btn btn-ghost text-sm">Annuler</button>
            <button type="submit" disabled={saving} className="btn btn-primary text-sm">
              {saving ? 'Enregistrement…' : editing === 'new' ? 'Ajouter et inviter' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/10">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 dark:bg-zinc-950">
            <tr className="text-left text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-600 dark:text-stone-400">
              <th className="px-4 py-2.5">Membre</th>
              <th className="px-4 py-2.5">Rôle</th>
              <th className="px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-50/10">
            {loading && [0, 1, 2].map((i) => (
              <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td></tr>
            ))}
            {!loading && members.map((m) => (
              <tr key={m.id} className="hover:bg-stone-50 dark:hover:bg-stone-50/5 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-950 dark:text-stone-50">
                    {m.name}
                    {isMe(m) && <span className="ml-2 text-[0.65rem] font-mono uppercase tracking-[0.12em] text-zinc-400 dark:text-stone-500">Vous</span>}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-stone-400">{m.email}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m, e.target.value as AdminRole)}
                    disabled={isMe(m) || busy != null}
                    aria-label={`Rôle de ${m.name}`}
                    title={isMe(m) ? 'Vous ne pouvez pas changer votre propre rôle.' : ROLE_SCOPE[m.role]}
                    className={`${INPUT} w-auto py-1.5 disabled:opacity-60`}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {m.invitation_pending ? (
                    <span className="inline-flex items-center rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[0.7rem] text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
                      Invitation envoyée
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-turf-200/70 bg-turf-50 px-2 py-0.5 text-[0.7rem] text-turf-800 dark:border-turf-400/20 dark:bg-turf-900/30 dark:text-turf-200">
                      Actif
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {m.invitation_pending && (
                      <button type="button" onClick={() => resendInvitation(m)} disabled={busy != null} className={ICON_BUTTON} aria-label={`Renvoyer l’invitation à ${m.name}`} title="Renvoyer l’invitation">
                        <EnvelopeSimple size={15} />
                      </button>
                    )}
                    <button type="button" onClick={() => openEdit(m)} disabled={busy != null} className={ICON_BUTTON} aria-label={`Modifier ${m.name}`} title="Modifier">
                      <PencilSimple size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      disabled={isMe(m) || busy != null}
                      className={`${ICON_BUTTON} hover:!text-rose-600 dark:hover:!text-rose-400`}
                      aria-label={`Supprimer ${m.name}`}
                      title={isMe(m) ? 'Vous ne pouvez pas supprimer votre propre compte.' : 'Supprimer'}
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((r) => (
          <div key={r} className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-50/10 dark:bg-zinc-900">
            <div className="font-display font-semibold text-zinc-950 dark:text-stone-50">{ROLE_LABELS[r]}</div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-stone-400">{ROLE_SCOPE[r]}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
