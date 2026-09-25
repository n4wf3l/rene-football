import LegalLayout from './LegalLayout'

/**
 * Full RGPD / CNPD Article 13 disclosure. Everything actually reflects
 * what the current backend stores (see ContactController + Player model)
 * so we never over-promise or under-disclose.
 */
export default function Confidentialite() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      updatedAt="25 septembre 2026"
      intro={
        <>
          Rene Football (« nous ») respecte votre vie privée et protège les
          données personnelles que vous nous confiez, conformément au{' '}
          <a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj" target="_blank" rel="noreferrer">
            Règlement général sur la protection des données (RGPD)
          </a>{' '}
          et à la <a href="https://cnpd.public.lu" target="_blank" rel="noreferrer">CNPD</a>.
          Cette page décrit précisément ce que nous collectons, pourquoi,
          combien de temps, et quels sont vos droits.
        </>
      }
    >
      <section>
        <h2>1. Responsable du traitement</h2>
        <p>
          Rene Football, dont les coordonnées figurent dans les{' '}
          <a href="/mentions-legales">mentions légales</a>, est responsable
          du traitement de vos données personnelles au sens du RGPD.
        </p>
        <p>
          Pour toute question relative à ce traitement, écrivez-nous à{' '}
          <a href="mailto:contact@renefootball.com">contact@renefootball.com</a>{' '}
          avec pour objet <code>RGPD</code>.
        </p>
      </section>

      <section>
        <h2>2. Données que nous collectons</h2>

        <h3>2.1 Formulaire de contact (obligatoire pour vous répondre)</h3>
        <ul>
          <li><strong>Nom</strong> et <strong>adresse email</strong>.</li>
          <li><strong>Téléphone</strong> (facultatif).</li>
          <li><strong>Message</strong> libre.</li>
          <li>
            <strong>Champs spécifiques à votre profil</strong> selon le
            parcours choisi : identité du joueur, poste, club actuel, niveau,
            URL vidéo, objectif, CV téléversé (parcours Joueur) ; nom du
            club, rôle, objet de la demande (parcours Club) ; nom du média,
            rôle, deadline (parcours Média) ; sujet (parcours Autre).
          </li>
          <li>
            <strong>CV téléversé</strong> — uniquement si vous choisissez
            d'en joindre un dans le parcours Joueur. Formats acceptés :
            PDF, JPG, PNG, WebP. Taille maximum 6 Mo.
          </li>
          <li><strong>Horodatage de votre consentement</strong>.</li>
        </ul>

        <h3>2.2 Données techniques (intérêt légitime — sécurité)</h3>
        <ul>
          <li>
            <strong>Adresse IP</strong> et <strong>user-agent</strong> de
            votre navigateur au moment de l'envoi du formulaire.
          </li>
          <li>
            Limitation à 5 requêtes par minute et par IP (protection
            anti-spam / anti-bot).
          </li>
        </ul>

        <h3>2.3 Données de navigation stockées localement</h3>
        <p>
          Nous utilisons le stockage local de votre navigateur
          (<code>localStorage</code>) uniquement pour mémoriser :
        </p>
        <ul>
          <li>Votre préférence de thème clair / sombre.</li>
          <li>
            Le dernier tutoriel ou onboarding que vous avez fermé (pour ne
            plus vous le montrer).
          </li>
          <li>
            La session admin (jeton d'authentification), uniquement si vous
            êtes membre de l'équipe et vous êtes connecté à{' '}
            <code>/admin</code>.
          </li>
        </ul>
        <p>
          Ces données restent sur votre appareil, ne quittent jamais votre
          navigateur, et ne servent à aucune finalité de suivi. Voir la
          page <a href="/cookies">Cookies &amp; traceurs</a> pour le
          détail.
        </p>

        <h3>2.4 Ce que nous NE collectons PAS</h3>
        <ul>
          <li>
            Aucun outil d'analytique (pas de Google Analytics, Matomo,
            Plausible, Hotjar, etc.).
          </li>
          <li>Aucun pixel de suivi publicitaire ni de réseau social.</li>
          <li>Aucune donnée biométrique, de santé ou de géolocalisation.</li>
          <li>
            Aucune donnée relative à des mineurs sans autorisation parentale
            écrite préalable et documentée.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités et bases légales</h2>
        <dl>
          <dt>Répondre à votre demande de contact</dt>
          <dd>Base légale : consentement (Art. 6.1.a RGPD).</dd>

          <dt>Sécurité du site (limitation débit, journaux)</dt>
          <dd>Base légale : intérêt légitime (Art. 6.1.f RGPD).</dd>

          <dt>Fonctionnement technique (thème, session admin)</dt>
          <dd>Base légale : intérêt légitime.</dd>

          <dt>Respect d'obligations légales (conservation contrats)</dt>
          <dd>Base légale : obligation légale (Art. 6.1.c RGPD).</dd>
        </dl>
      </section>

      <section>
        <h2>4. Destinataires</h2>
        <p>
          Vos données sont accessibles uniquement à l'équipe de Rene
          Football et à ses prestataires techniques directs (hébergement,
          messagerie). Nous ne vendons, ne louons et ne partageons vos
          données avec aucun tiers à des fins commerciales.
        </p>
        <p>
          Les seuls transferts hors de l'Union européenne susceptibles
          d'intervenir concernent :
        </p>
        <ul>
          <li>
            <strong>Google Fonts</strong> (États-Unis) — pour charger les
            polices d'écriture du site. Google peut recevoir votre adresse
            IP lors de la première visite. Aucun cookie n'est déposé.
          </li>
          <li>
            <strong>YouTube (Google, États-Unis)</strong> — uniquement si
            vous choisissez de lire une vidéo intégrée. Nous utilisons le
            mode <em>youtube-nocookie</em> qui empêche tout dépôt de cookie
            avant lecture.
          </li>
        </ul>
        <p>
          Ces transferts s'effectuent dans le cadre de clauses
          contractuelles types de la Commission européenne.
        </p>
      </section>

      <section>
        <h2>5. Durée de conservation</h2>
        <dl>
          <dt>Demandes de contact traitées et sans suite</dt>
          <dd>12 mois maximum après le dernier échange.</dd>

          <dt>Demandes ayant abouti à une relation contractuelle</dt>
          <dd>Durée du contrat + 5 ans (obligations comptables et légales).</dd>

          <dt>CV téléversés</dt>
          <dd>
            12 mois maximum après le dernier échange, sauf accord explicite
            pour un archivage plus long.
          </dd>

          <dt>Journaux de sécurité (IP, user-agent)</dt>
          <dd>12 mois maximum.</dd>

          <dt>Données stockées localement (thème, session)</dt>
          <dd>Tant que vous ne les effacez pas depuis votre navigateur.</dd>
        </dl>
      </section>

      <section>
        <h2>6. Vos droits</h2>
        <p>Conformément aux articles 15 à 22 du RGPD, vous disposez :</p>
        <ul>
          <li><strong>Droit d'accès</strong> — obtenir copie des données que nous détenons.</li>
          <li><strong>Droit de rectification</strong> — corriger des données inexactes.</li>
          <li><strong>Droit à l'effacement</strong> (« droit à l'oubli »).</li>
          <li><strong>Droit à la portabilité</strong> — recevoir vos données dans un format structuré.</li>
          <li><strong>Droit d'opposition</strong> au traitement fondé sur l'intérêt légitime.</li>
          <li><strong>Droit à la limitation</strong> du traitement.</li>
          <li>
            <strong>Droit de retirer votre consentement</strong> à tout
            moment (sans effet sur la licéité des traitements passés).
          </li>
        </ul>
        <p>
          Pour exercer ces droits : écrivez-nous à{' '}
          <a href="mailto:contact@renefootball.com">contact@renefootball.com</a>{' '}
          avec pour objet <code>RGPD</code> et une pièce d'identité pour
          justifier votre demande. Nous vous répondons dans un délai maximal
          d'un mois.
        </p>
      </section>

      <section>
        <h2>7. Réclamation auprès de la CNPD</h2>
        <p>
          Si vous estimez que nous n'avons pas répondu à votre demande, vous
          pouvez saisir la Commission nationale pour la protection des
          données (CNPD) :
        </p>
        <dl>
          <dt>Adresse postale</dt>
          <dd>15, boulevard du Jazz, L-4370 Belvaux, Luxembourg</dd>
          <dt>Téléphone</dt>
          <dd><a href="tel:+35226101260">+352 26 10 12 60</a></dd>
          <dt>Site</dt>
          <dd><a href="https://cnpd.public.lu" target="_blank" rel="noreferrer">cnpd.public.lu</a></dd>
        </dl>
      </section>

      <section>
        <h2>8. Sécurité</h2>
        <p>
          Le site fonctionne exclusivement en HTTPS. Les téléversements
          (CV) sont stockés sur des serveurs européens, filtrés par
          extension et taille, et servis via des URLs signées. Les
          données du back-office sont protégées par une authentification
          Sanctum et un contrôle d'accès basé sur les rôles.
        </p>
      </section>

      <section>
        <h2>9. Modifications</h2>
        <p>
          Cette politique peut évoluer. La date de dernière mise à jour est
          indiquée en tête de page. En cas de modification substantielle,
          nous vous en informerons via le formulaire de contact.
        </p>
      </section>
    </LegalLayout>
  )
}
