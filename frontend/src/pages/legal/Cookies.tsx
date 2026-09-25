import LegalLayout from './LegalLayout'

/**
 * Full inventory of what we store locally + what third-party services can
 * touch the browser. Mirrors what the code actually does; when an
 * analytics / marketing tool is added later, both this page and the
 * <CookieNotice /> banner will need an update.
 */
export default function Cookies() {
  return (
    <LegalLayout
      title="Cookies &amp; traceurs"
      updatedAt="25 septembre 2026"
      intro={
        <>
          Notre site ne dépose <strong>aucun cookie de suivi, d'analytique
          ou publicitaire</strong>. Nous n'utilisons que le stockage local
          strictement nécessaire au fonctionnement du site. Cette page en
          liste le détail conformément à la{' '}
          <a href="https://cnpd.public.lu/fr/dossiers-thematiques/cookies0.html" target="_blank" rel="noreferrer">
            doctrine cookies de la CNPD
          </a>{' '}
          (novembre 2021).
        </>
      }
    >
      <section>
        <h2>1. Ce que la loi appelle « cookie »</h2>
        <p>
          Sont visés par la réglementation les cookies HTTP, mais aussi les
          traceurs équivalents : <code>localStorage</code>,{' '}
          <code>sessionStorage</code>, pixels invisibles, empreinte navigateur.
          La CNPD impose votre consentement préalable pour tout traceur{' '}
          <strong>non strictement nécessaire</strong>. À l'inverse, les
          traceurs strictement nécessaires au fonctionnement du site (session,
          préférence utilisateur, sécurité) sont exemptés de consentement.
        </p>
      </section>

      <section>
        <h2>2. Stockage local utilisé sur ce site</h2>
        <p>
          Tous les traceurs listés ci-dessous sont{' '}
          <strong>strictement nécessaires</strong> — aucun consentement
          n'est requis, mais nous les documentons pour transparence.
        </p>

        <h3>Site public</h3>
        <dl>
          <dt><code>theme</code> · <em>localStorage</em></dt>
          <dd>
            Mémorise votre préférence claire / sombre. Persistant jusqu'à
            effacement manuel. Aucune donnée transmise à un tiers.
          </dd>

          <dt><code>tutorial_dismissed_*</code> · <em>localStorage</em></dt>
          <dd>
            Indique qu'un tutoriel a été fermé pour ne plus vous le
            présenter. Purement local.
          </dd>

          <dt><code>rf_cookie_notice_ack</code> · <em>localStorage</em></dt>
          <dd>
            Trace que vous avez pris connaissance du bandeau d'information.
            Renouvelée au maximum tous les 12 mois conformément à la
            recommandation CNPD.
          </dd>
        </dl>

        <h3>Espace admin (uniquement si vous êtes membre de l'équipe)</h3>
        <dl>
          <dt><code>rene_admin_token</code> · <em>localStorage</em></dt>
          <dd>
            Jeton d'authentification Sanctum. Créé à la connexion sur{' '}
            <code>/admin/login</code>, supprimé à la déconnexion. Nécessaire
            pour maintenir votre session.
          </dd>

          <dt><code>rene_admin_sidebar_open</code> · <em>localStorage</em></dt>
          <dd>Mémorise l'état ouvert/fermé de la sidebar de l'admin.</dd>

          <dt>Divers <code>*_state</code> · <em>localStorage</em></dt>
          <dd>
            Préférences d'affichage (colonnes, filtres, vue par défaut)
            pour les tableaux de bord scouting et analyse.
          </dd>
        </dl>
      </section>

      <section>
        <h2>3. Services tiers</h2>

        <h3>Google Fonts (<em>fonts.googleapis.com</em>)</h3>
        <p>
          Nos polices d'écriture (Outfit, Geist, Geist Mono) sont chargées
          depuis les serveurs de Google. Aucun cookie n'est déposé, mais
          votre adresse IP est transmise à Google lors du premier chargement.
          Google peut la conserver dans ses journaux de service à des fins
          de débogage et de sécurité, avec un transfert vers les États-Unis.
        </p>
        <p>
          Pour bloquer ce chargement, vous pouvez utiliser une extension
          type <em>uBlock Origin</em> ou <em>NoScript</em>. Le site restera
          fonctionnel avec ses polices systèmes de repli.
        </p>

        <h3>flagcdn.com</h3>
        <p>
          Utilisé pour afficher les drapeaux de pays dans le formulaire
          de contact (parcours Club / Média) et dans le générateur de
          fiches marketing. Aucun cookie n'est déposé. Requêtes uniquement
          après interaction utilisateur.
        </p>

        <h3>YouTube (<em>youtube-nocookie.com</em>)</h3>
        <p>
          Certains articles ou fiches joueurs peuvent embarquer une vidéo
          YouTube. Nous utilisons le mode privacy-enhanced qui{' '}
          <strong>n'installe aucun cookie avant que vous ne cliquiez sur
          Lecture</strong>. Si vous lancez la vidéo, YouTube (Google, États-Unis)
          peut alors déposer ses propres cookies conformément à sa politique.
        </p>

        <h3>QR codes (<em>api.qrserver.com</em>)</h3>
        <p>
          Utilisé exclusivement à la génération des présentations PDF côté
          admin. Ne concerne pas la navigation grand public.
        </p>
      </section>

      <section>
        <h2>4. Vos moyens de contrôle</h2>
        <p>
          Vous pouvez à tout moment effacer les données stockées localement
          par ce site depuis les paramètres de votre navigateur :
        </p>
        <ul>
          <li><strong>Chrome / Edge</strong> — Paramètres → Confidentialité → Effacer les données de navigation → cocher « Cookies et autres données de sites ».</li>
          <li><strong>Firefox</strong> — Paramètres → Vie privée et sécurité → Cookies et données de site → Gérer les données.</li>
          <li><strong>Safari</strong> — Réglages → Confidentialité → Gérer les données de site web.</li>
        </ul>
        <p>
          Effacer <code>rene_admin_token</code> vous déconnecte de l'espace
          admin. Effacer les préférences de thème réinitialisera votre choix
          à la valeur par défaut du système.
        </p>
      </section>

      <section>
        <h2>5. En cas de doute</h2>
        <p>
          Contactez-nous à{' '}
          <a href="mailto:contact@renefootball.com">contact@renefootball.com</a>{' '}
          avec pour objet <code>Cookies</code>, ou consultez la{' '}
          <a href="/confidentialite">politique de confidentialité</a> pour
          le détail des traitements. Vous pouvez également saisir la{' '}
          <a href="https://cnpd.public.lu" target="_blank" rel="noreferrer">CNPD</a>.
        </p>
      </section>
    </LegalLayout>
  )
}
