import { useTranslation } from 'react-i18next'
import LegalLayout from './LegalLayout'
import { useAppSettings } from '../../lib/useAppSettings'

/**
 * Mentions légales — valeurs issues de /api/settings depuis que l'admin peut
 * les éditer dans la section Réglages. Chaque champ est null-safe : tant que
 * la valeur n'est pas remplie côté admin, on affiche "En cours
 * d'enregistrement" (identité juridique) ou le défaut raisonnable
 * (contact : contact@renefootball.com / +352 691 712 574). La bannière ambre
 * en haut de page reste tant qu'au moins un champ légal est manquant.
 */
const FALLBACK_EMAIL = 'contact@renefootball.com'
const FALLBACK_PHONE = '+352 691 712 574'
const FALLBACK_CITY  = 'Luxembourg-Ville, Grand-Duché de Luxembourg'
const FALLBACK_DIRECTOR = 'René Jacob Yougbaré, fondateur de Rene Football'
const PENDING = 'En cours d\'enregistrement.'

export default function MentionsLegales() {
  const { t } = useTranslation()
  const { settings } = useAppSettings()
  const { legal, contact } = settings

  const email = contact.email ?? FALLBACK_EMAIL
  const phone = contact.phone ?? FALLBACK_PHONE
  const telUri = `tel:${phone.replace(/[\s()-]/g, '')}`
  const city  = contact.office_city ?? FALLBACK_CITY

  // The pending banner shows as long as at least one legal field is empty.
  const legalPending = !legal.legal_form || !legal.rcs_number || !legal.vat_number || !legal.registered_office_address

  return (
    <LegalLayout
      titleKey="legal.mentions.title"
      updatedAt="30 septembre 2026"
      summaryKey="legal.mentions.summary"
      intro={
        <>
          {legalPending && (
            <div className="mb-6 rounded-2xl border border-amber-300/70 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/[0.08] p-4 text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
              <div className="font-semibold mb-1">{t('legal.mentions.pendingTitle')}</div>
              <div>{t('legal.mentions.pendingBody')}</div>
            </div>
          )}
          Conformément à la <a href="https://cnpd.public.lu" target="_blank" rel="noreferrer">CNPD</a>{' '}
          (Commission nationale pour la protection des données) et à la loi
          luxembourgeoise, cette page identifie l'éditeur du site, son
          hébergement et les modalités de contact.
        </>
      }
    >
      <section>
        <h2>Éditeur du site</h2>
        <dl>
          <dt>Dénomination</dt>
          <dd>Rene Football</dd>
          <dt>Forme juridique</dt>
          <dd>{legal.legal_form ?? PENDING}</dd>
          <dt>Numéro RCS Luxembourg</dt>
          <dd>{legal.rcs_number ?? PENDING}</dd>
          <dt>Numéro TVA intracommunautaire</dt>
          <dd>{legal.vat_number ?? PENDING}</dd>
          <dt>Siège social</dt>
          <dd>{legal.registered_office_address ?? city}</dd>
          <dt>Directeur de la publication</dt>
          <dd>{legal.publication_director ?? FALLBACK_DIRECTOR}</dd>
          <dt>Contact</dt>
          <dd>
            <a href={`mailto:${email}`}>{email}</a> ·{' '}
            <a href={telUri}>{phone}</a>
          </dd>
        </dl>
      </section>

      <section>
        <h2>Hébergement</h2>
        <dl>
          <dt>Hébergeur</dt>
          <dd>
            Hostinger International Ltd, 61 Lordou Vironos Street, 6023
            Larnaca, Chypre. Site :{' '}
            <a href="https://www.hostinger.com" target="_blank" rel="noreferrer">
              www.hostinger.com
            </a>.
          </dd>
          <dt>Localisation des serveurs</dt>
          <dd>Union européenne (centre de données Hostinger).</dd>
          <dt>Contact hébergeur pour un signalement de contenu illicite</dt>
          <dd>
            <a href="https://www.hostinger.com/abuse" target="_blank" rel="noreferrer">
              hostinger.com/abuse
            </a>
          </dd>
        </dl>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L'ensemble des contenus présents sur ce site (textes, photos,
          logos, marques, données joueurs, fiches PDF, articles) est la
          propriété exclusive de Rene Football ou fait l'objet d'une
          autorisation d'usage. Toute reproduction, adaptation ou
          représentation sans autorisation écrite préalable est interdite
          et constitue une contrefaçon au sens des articles L.335-2 et
          suivants du Code de la propriété intellectuelle.
        </p>
        <p>
          Les photos de joueurs mineurs présentes sur le site font l'objet
          d'une autorisation parentale écrite conservée par l'agence.
        </p>
      </section>

      <section>
        <h2>Responsabilité</h2>
        <p>
          Rene Football met tout en œuvre pour fournir des informations
          exactes et à jour. L'agence ne saurait toutefois être tenue
          responsable des erreurs, omissions ou de l'indisponibilité
          temporaire du site. Les données statistiques (matchs joués,
          buts, minutes) affichées sur les fiches joueurs sont
          renseignées manuellement par l'équipe et actualisées à
          fréquence variable.
        </p>
      </section>

      <section>
        <h2>Liens hypertextes</h2>
        <p>
          Le site peut contenir des liens vers des sites tiers (clubs,
          fédérations, presse). Rene Football n'exerce aucun contrôle sur
          ces sites et décline toute responsabilité quant à leurs
          contenus, politiques de confidentialité ou pratiques.
        </p>
      </section>

      <section>
        <h2>Droit applicable</h2>
        <p>
          Le présent site est soumis au droit luxembourgeois. Tout litige
          relatif à son utilisation relève de la compétence exclusive
          des juridictions luxembourgeoises.
        </p>
      </section>
    </LegalLayout>
  )
}
