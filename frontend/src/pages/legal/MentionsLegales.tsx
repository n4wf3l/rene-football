import LegalLayout from './LegalLayout'

/**
 * Placeholder identity fields (RCS, siège social) are marked TODO so the
 * agency fills them in before ship. Every other field is agency-verified
 * from the wizard footer (email + phone + Luxembourg location).
 */
export default function MentionsLegales() {
  return (
    <LegalLayout
      title="Mentions légales"
      updatedAt="25 septembre 2026"
      intro={
        <>
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
          <dd>À compléter avant mise en production (SARL / SA / indépendant).</dd>
          <dt>Numéro RCS Luxembourg</dt>
          <dd>À compléter.</dd>
          <dt>Numéro TVA intracommunautaire</dt>
          <dd>À compléter (format LU + 8 chiffres).</dd>
          <dt>Siège social</dt>
          <dd>Luxembourg-Ville, Grand-Duché de Luxembourg.</dd>
          <dt>Directeur de la publication</dt>
          <dd>René Ajari.</dd>
          <dt>Contact</dt>
          <dd>
            <a href="mailto:contact@renefootball.com">contact@renefootball.com</a> ·{' '}
            <a href="tel:+352661241847">+352 661 24 18 47</a>
          </dd>
        </dl>
      </section>

      <section>
        <h2>Hébergement</h2>
        <dl>
          <dt>Hébergeur du site</dt>
          <dd>À compléter avant mise en production (nom + adresse du prestataire).</dd>
          <dt>Localisation des serveurs</dt>
          <dd>Union européenne.</dd>
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
