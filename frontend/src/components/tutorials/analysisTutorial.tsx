import {
  ChartBar, ChartLine, DownloadSimple, FilmSlate, Gauge,
  SoccerBall, UploadSimple, UsersThree,
} from '@phosphor-icons/react'
import type { TutorialStep } from '../TutorialModal'

/**
 * Data Analyse walkthrough. Each step that describes a tab targets the
 * corresponding pill in the header via `data-tour="analysis-tab-<key>"`
 * AND uses `onEnter` to auto-switch the view so the user sees the actual
 * content while reading the tooltip.
 *
 * Content stays plain-language so a non-analyst can follow it: WHAT it
 * does + WHY it matters + a concrete example.
 */

type ViewKind = 'chart' | 'pitch' | 'compare' | 'clips' | 'evolution' | 'benchmark'

export function analysisTutorialSteps(setView: (v: ViewKind) => void): TutorialStep[] {
  return [
    {
      title: 'Bienvenue dans Data Analyse',
      icon: Gauge,
      description: (
        <>
          Cette page transforme les <strong>chiffres bruts</strong> de vos joueurs (buts, xG, distance
          parcourue…) en <strong>informations exploitables</strong> pour la direction sportive.
          On va parcourir les 6 outils ensemble — vous verrez chaque onglet s'ouvrir tout seul.
        </>
      ),
      bullets: [
        'Comparez vos joueurs entre eux',
        'Positionnez-les contre des profils de référence (elite / moyenne)',
        'Suivez leur évolution match par match',
        'Exportez PDF, CSV ou PNG en 1 clic pour vos réunions',
      ],
    },
    {
      title: 'Graphiques — croiser deux métriques',
      icon: ChartBar,
      target: 'analysis-tab-chart',
      onEnter: () => setView('chart'),
      description: (
        <>
          Créez n'importe quel graphique en <strong>croisant deux métriques</strong>. Utile pour
          repérer les <strong>outliers</strong> — les joueurs qui sortent du lot sur une dimension.
        </>
      ),
      bullets: [
        'Ex : Âge × Buts → vous voyez les jeunes qui marquent déjà beaucoup',
        'Bascule « Par 90 min » pour normaliser sur ceux qui jouent peu',
        'Couleur par catégorie / poste / statut scouting',
      ],
      tip: 'Cliquez sur un point du graphique pour ouvrir la fiche joueur correspondante.',
    },
    {
      title: 'Évolution — dynamique match par match',
      icon: ChartLine,
      target: 'analysis-tab-evolution',
      onEnter: () => setView('evolution'),
      description: (
        <>
          Trace le <strong>parcours match par match</strong> d'un joueur : note, buts, xG, minutes.
          Idéal pour repérer une <strong>forme montante</strong> ou une chute.
        </>
      ),
      bullets: [
        'Moyenne glissante 5 matchs pour lisser le bruit',
        'Détecte les regains de forme ou creux à surveiller',
      ],
      tip: 'Les données viennent des matchs importés via « Importer CSV » → Matchs joués.',
    },
    {
      title: 'Benchmark — position × âge',
      icon: Gauge,
      target: 'analysis-tab-benchmark',
      onEnter: () => setView('benchmark'),
      description: (
        <>
          Compare un joueur au <strong>profil de référence</strong> de son poste ET de sa tranche
          d'âge. Vous voyez tout de suite <strong>« 82% du profil elite U21 »</strong> au lieu de
          deviner si un chiffre est bon.
        </>
      ),
      bullets: [
        'Chaque métrique : votre joueur vs moyenne vs elite',
        'Badge « Elite / Au-dessus / Autour / Sous / Loin »',
        'Éditer les benchmarks pour votre championnat spécifique',
      ],
      tip: 'Export CSV pour Excel ou Dossier PDF interne pour la réunion staff.',
    },
    {
      title: 'Terrain — heatmap',
      icon: SoccerBall,
      target: 'analysis-tab-pitch',
      onEnter: () => setView('pitch'),
      description: (
        <>
          Affiche où le joueur <strong>touche le ballon</strong>. Rouge = zone très active,
          jaune = zone occasionnelle. Comparez 2 joueurs côte à côte pour évaluer la
          <strong> complémentarité tactique</strong>.
        </>
      ),
      bullets: [
        'Activez « Éditer » pour peindre la heatmap à la souris',
        'Ou régénérez automatiquement depuis le poste du joueur',
      ],
    },
    {
      title: 'Comparaison — radar de 2 à 4 joueurs',
      icon: UsersThree,
      target: 'analysis-tab-compare',
      onEnter: () => setView('compare'),
      description: (
        <>
          Empilez <strong>2 à 4 joueurs</strong> sur un radar avec <strong>silhouette elite en
          pointillé</strong>. Vous voyez immédiatement qui approche le profil top et sur quelles
          dimensions.
        </>
      ),
      bullets: [
        'Bouton Copier → PNG dans le presse-papiers (paster dans Slack/mail)',
        'Bouton PNG → téléchargement direct',
        'Table de comparaison côte-à-côte en dessous',
      ],
    },
    {
      title: 'Moments clés — annotations vidéo',
      icon: FilmSlate,
      target: 'analysis-tab-clips',
      onEnter: () => setView('clips'),
      description: (
        <>
          Annotez des <strong>séquences vidéo</strong> : import local, pause sur l'instant clé,
          dessin par-dessus, sauvegarde de la frame finale. Preuves visuelles à joindre à un
          rapport scout.
        </>
      ),
      tip: 'Vos vidéos ne sont jamais envoyées au serveur — seule la frame annotée est stockée.',
    },
    {
      title: 'Astuce : nourrir la data',
      icon: UploadSimple,
      description: (
        <>
          Toute l'analyse tourne autour de <strong>vraies données</strong>. Depuis la page Joueurs,
          cliquez sur <strong>« Importer CSV »</strong> pour pousser en masse un export Wyscout,
          Instat ou un fichier Excel club.
        </>
      ),
      bullets: [
        "Deux modes : stats agrégées OU matchs joués (pour l'onglet Évolution)",
        'Chaque import trace la source + la date + la fiabilité',
        'Un template pré-rempli est téléchargeable en 1 clic',
      ],
    },
    {
      title: 'Vous êtes prêt',
      icon: DownloadSimple,
      description: (
        <>
          Vous savez maintenant lire un joueur en 30 secondes : <strong>Benchmark</strong> pour le
          contexte, <strong>Terrain</strong> pour le style, <strong>Comparaison</strong> pour le
          classement.
        </>
      ),
      bullets: [
        'Cochez « Ne plus afficher » pour ne plus l\'avoir au chargement',
        'Le bouton « Guide » en haut de page le rouvre à tout moment',
      ],
    },
  ]
}
