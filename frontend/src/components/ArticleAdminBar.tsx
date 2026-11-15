import { Link, useNavigate } from 'react-router-dom'
import { PencilSimple, ShieldCheck, Trash } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'
import { useConfirm } from './ConfirmProvider'
import { useToast } from './ToastProvider'

interface ArticleAdminBarProps {
  slug: string
  title: string
}

/**
 * Edit / delete controls on a public article, shown only to a signed-in
 * admin. Visitors never see it (and the API refuses these actions to them).
 */
export default function ArticleAdminBar({ slug, title }: ArticleAdminBarProps) {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()

  if (!isAuthenticated || !user?.is_admin) return null

  const onDelete = async () => {
    const ok = await confirm({
      title: t('article.admin.confirmTitle', { title }),
      body: t('article.admin.confirmBody'),
      confirmLabel: t('article.admin.delete'),
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/admin/articles/${slug}`, { auth: true })
      toast.success(t('article.admin.deleted', { title }))
      navigate('/actualites', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t('article.admin.deleteError'))
    }
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-stone-50/15 bg-zinc-950/60 p-1 pl-3 backdrop-blur">
      <span className="inline-flex items-center gap-1.5 pr-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-turf-200">
        <ShieldCheck size={12} weight="bold" />
        {t('article.admin.label')}
      </span>
      <Link
        to={`/admin/articles/${slug}/edit`}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-stone-100 transition hover:bg-stone-50/10"
      >
        <PencilSimple size={13} weight="bold" />
        {t('article.admin.edit')}
      </Link>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/15"
      >
        <Trash size={13} weight="bold" />
        {t('article.admin.delete')}
      </button>
    </div>
  )
}
