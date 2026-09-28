# Rene Football — Coding rules for Claude

Ce fichier définit les règles non-négociables. Elles s'appliquent à toute
modification du site.

## 1. UI — Jamais de `alert()` ni de `confirm()` natif

Le site ne doit **jamais** appeler `alert()`, `window.alert()`, `confirm()`
ou `window.confirm()`. Ces dialogues cassent la charte graphique et bloquent
le thread principal. À la place :

**Confirmation utilisateur** — utiliser le hook `useConfirm()` du
[ConfirmProvider](frontend/src/components/ConfirmProvider.tsx) :

```tsx
import { useConfirm } from '../components/ConfirmProvider'

const confirm = useConfirm()
const ok = await confirm({
  title: 'Supprimer « X » ?',
  body: 'Cette action est définitive.',
  confirmLabel: 'Supprimer',
  danger: true,
})
if (!ok) return
```

Le composant est monté une fois au niveau `main.tsx` et affiche un modal
avec l'esthétique du site (backdrop, dark-mode, focus autoCta, bouton rouge
si `danger: true`). Retourne une `Promise<boolean>`.

**Erreurs / notifications non-bloquantes** — toast (voir §2), pas alert.

## 2. UX — Toast obligatoire sur chaque CRUD

Chaque action qui déclenche une mutation serveur (POST / PUT / PATCH /
DELETE) **doit** produire une notification toast en bas à droite,
positive sur succès, rouge sur échec. Silence = bug.

Utiliser le hook `useToast()` du
[ToastProvider](frontend/src/components/ToastProvider.tsx) :

```tsx
import { useToast } from '../components/ToastProvider'

const toast = useToast()

try {
  await api.post('/admin/joueurs', payload, { auth: true })
  toast.success('Joueur créé.')
} catch (err) {
  const msg = err instanceof Error ? err.message : 'Enregistrement impossible.'
  toast.error(msg)
}
```

API disponible : `toast.success(msg)`, `toast.error(msg)`, `toast.info(msg)`.
Auto-dismiss après ~4 s, dismissable via la croix. Rendu unique au niveau
racine, pas besoin de gérer d'état local.

**Ne pas** re-implémenter un composant Toast local : utiliser le hook
global. Les composants locaux `Toast` historiques
([components/Toast.tsx](frontend/src/components/Toast.tsx)) sont dépréciés,
migrer vers `useToast()` quand tu passes dessus.

## 3. i18n — Toujours vérifier les 5 locales

Le site est multilingue : **FR / EN / DE / NL / LB**. Les fichiers sont dans
[frontend/src/i18n/locales/](frontend/src/i18n/locales/).

Règles :

- **Aucun texte utilisateur ne doit être hardcodé.** Tout label, titre,
  placeholder, aria-label, message d'erreur, contenu de toast/modal, etc.
  passe par `useTranslation()` et une clé i18n.
- Quand tu ajoutes une clé dans `fr.json`, tu **dois** l'ajouter aux 4
  autres locales (en, de, nl, lb) dans le même commit. Un site partiel
  cassé en LB n'est pas acceptable — mieux vaut du texte anglais de repli
  qu'un message hardcodé qui contourne le système.
- Pour du contenu venant de la BDD (bios, articles, noms de partenaires),
  garder le contenu en français : c'est une donnée saisie par l'agence,
  pas du chrome UI. Ne pas essayer de "traduire" à la volée.
- Séparateurs numériques et dates : utiliser
  `toLocaleString(i18n.resolvedLanguage, …)` ou
  `Intl.DateTimeFormat(i18n.resolvedLanguage, …)`, jamais de format
  français en dur.
- Pages légales (Mentions/Confidentialité/Cookies) : le contenu français
  fait foi. Une bannière ambre `legal.authoritativeNotice` s'affiche aux
  visiteurs non-FR. Ne pas traduire les bodies sans validation juridique.

**Checklist avant de considérer une feature terminée :**

1. Aucun texte hardcodé en français dans le code TypeScript / JSX public ?
2. Clés ajoutées aux 5 locales (fr / en / de / nl / lb) ?
3. `npx tsc --noEmit` passe ?
4. Les 5 fichiers JSON parsent ? (`node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/<code>.json','utf8'))"`)

## 4. Workflow git

- Toujours créer une branche feature depuis `main` (`feat/xxx`, `fix/xxx`).
- Commit, push la branche, puis `git merge --no-ff` dans `main` + push
  `main`. Pas de commit direct sur `main`.
- Message de commit en français, style `type(scope): résumé`.

## 5. Où trouver quoi

- **API client** : `frontend/src/api/client.ts` — `api.get / post / put / delete`
  avec option `auth: true` pour joindre le token admin.
- **i18n** : `frontend/src/i18n/` — `index.ts` init + 5 fichiers de locale.
- **Modals & toasts** : `frontend/src/components/{ConfirmProvider,ToastProvider}.tsx`.
- **Composants publics vs admin** :
  - Public : `pages/{Home,Players,PlayerProfile,ArticleDetail,Actualites,APropos,Contact,NotFound,PublicPresentation,Placeholder,legal/*}.tsx`
  - Admin : `pages/admin/*` et `components/{Scouting,admin,tutorials}/*`,
    `components/{BenchmarksEditor,ClipsGalleryAdmin,PresentationPreview,StatsImportModal,PlayerMultiSelect,PlayerSingleSelect,PlayerComparisonTable,Pdf*,TagPicker,Tutorial*,ClipAnnotator}.tsx`.
- **Backend Laravel** : `backend/` — modèles Eloquent, migrations, controllers
  sous `app/Http/Controllers/{Api,Api/Admin}/*`.

## 6. Comptes de démo

Admin de test : `admin@rene-football.test` / `admin1234` (voir seeder).
