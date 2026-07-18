import {
  Binoculars, Briefcase, ChartLineUp, ChartPie, Clipboard, House,
  ListChecks, SoccerBall, Stack, Target, VideoCamera,
} from '@phosphor-icons/react'
import type { TutorialStep } from '../TutorialModal'
import type { ScoutingView } from '../../types/scouting'

/**
 * Scouting cockpit walkthrough. Each step targets the corresponding
 * sidebar tab via `data-tour="scout-tab-<view>"` and auto-navigates via
 * `onEnter` so the user reads the description AND sees the destination
 * highlighted in the shell.
 */

export function scoutingTutorialSteps(goTo: (v: ScoutingView) => void): TutorialStep[] {
  return [
    {
      title: 'Bienvenue dans le Scouting',
      icon: Binoculars,
      description: (
        <>
          Le Scouting est votre <strong>cockpit terrain</strong> : joueurs suivis, rapports
          d'observation, missions, shortlists, besoins de recrutement. Un onglet par étape du
          pipeline, de la <strong>découverte</strong> à la <strong>validation</strong>.
        </>
      ),
      bullets: [
        'Un scout observe → écrit un rapport → un chef de scouting valide',
        'Les joueurs suivis passent par : découvert → watchlist → shortlist A → validé',
        'Tout est audité (qui a écrit quoi, quand)',
      ],
    },
    {
      title: 'Tableau de bord',
      icon: House,
      target: 'scout-tab-dashboard',
      onEnter: () => goTo('dashboard'),
      description: (
        <>
          Vue d'ensemble à l'ouverture : <strong>priorités du jour</strong>, joueurs qui remontent,
          alertes sur les dossiers en retard, rapports en attente de validation.
        </>
      ),
      tip: 'Consultez-le d\'abord chaque matin pour vous orienter.',
    },
    {
      title: 'Joueurs suivis',
      icon: SoccerBall,
      target: 'scout-tab-players',
      onEnter: () => goTo('players'),
      description: (
        <>
          Base des joueurs <strong>partagés Rene Football</strong>. Filtrez par statut, catégorie,
          poste. Cliquez un joueur pour ouvrir sa fiche scouting (score global, sources, risques,
          historique).
        </>
      ),
      bullets: [
        'Score global = actuel + potentiel + adéquation club',
        'Complétude du dossier en % pour repérer les fiches à enrichir',
      ],
    },
    {
      title: 'Matchs',
      icon: Stack,
      target: 'scout-tab-matches',
      onEnter: () => goTo('matches'),
      description: (
        <>
          Calendrier des rencontres à observer. Sert de base au module Missions pour rattacher une
          observation à un match précis.
        </>
      ),
    },
    {
      title: 'Rapports scouts',
      icon: Clipboard,
      target: 'scout-tab-reports',
      onEnter: () => goTo('reports'),
      description: (
        <>
          Cœur du métier. Cycle <strong>draft → soumis → validé</strong> (ou « à retravailler »).
          Routés <strong>automatiquement</strong> au bon validateur selon la catégorie du joueur.
        </>
      ),
      bullets: [
        'Note globale + points forts / faibles / actions clés',
        'Recommandation : ne pas poursuivre → watchlist → shortlist B/A → recruter',
        'Onglets « Pour moi » / « Tous » / par statut',
      ],
    },
    {
      title: 'Missions',
      icon: ListChecks,
      target: 'scout-tab-missions',
      onEnter: () => goTo('missions'),
      description: (
        <>
          Attributions terrain : « <strong>observer X vs Y le date Z</strong> ». Au bout, le scout
          rend un rapport. Statut : à faire → en cours → rapport soumis → validé.
        </>
      ),
    },
    {
      title: 'Shortlists',
      icon: ChartPie,
      target: 'scout-tab-shortlists',
      onEnter: () => goTo('shortlists'),
      description: (
        <>
          Regroupez vos <strong>cibles par besoin</strong> (ex. « Ailier gauche été 2026 »).
          Rang, prix estimé, niveau de confiance, prochaine action.
        </>
      ),
      tip: 'Une shortlist est ce qu\'on présente aux dirigeants — c\'est votre livrable.',
    },
    {
      title: 'Besoins de recrutement',
      icon: Target,
      target: 'scout-tab-needs',
      onEnter: () => goTo('needs'),
      description: (
        <>
          Formulez explicitement les <strong>postes ouverts</strong> avec budget, profil, deadline.
          Chaque besoin alimente ses shortlists — le lien est explicite.
        </>
      ),
    },
    {
      title: 'Vidéos',
      icon: VideoCamera,
      target: 'scout-tab-videos',
      onEnter: () => goTo('videos'),
      description: (
        <>
          Annotations sur des séquences vidéo (import local, dessins, capture). Preuve visuelle
          jointe à un rapport ou à une shortlist.
        </>
      ),
    },
    {
      title: 'Intelligence',
      icon: ChartLineUp,
      target: 'scout-tab-intelligence',
      onEnter: () => goTo('intelligence'),
      description: (
        <>
          Alertes proactives : dossiers en retard, opportunités détectées, joueurs qui explosent
          dans leurs stats. Le scouting <strong>vient à vous</strong> au lieu de fouiller.
        </>
      ),
    },
    {
      title: 'Boîte perso — votre espace privé',
      icon: Briefcase,
      target: 'scout-tab-perso',
      onEnter: () => goTo('perso'),
      description: (
        <>
          <strong>Nouveauté clé.</strong> Un espace scout <strong>strictement privé</strong> pour
          votre travail en parallèle chez un client externe (par ex. FC X, un club qui vous
          emploie en freelance). Rien ici <strong>n'apparaît côté Rene Football</strong>.
        </>
      ),
      bullets: [
        'Prospects, notes, ratings, recommandations : privés, à vous seul',
        'Renommez-la avec le nom de votre client (« FC X », « Standard Recruiting »…)',
        'Structure identique à l\'espace partagé : identité, stats, notes scout',
      ],
      tip: 'Pratique pour cumuler agence + club sans mélanger les données.',
    },
    {
      title: 'Vous êtes prêt',
      icon: Binoculars,
      description: (
        <>
          Le workflow standard : <strong>Dashboard</strong> pour vos priorités → <strong>Missions</strong>
          pour vos observations du jour → <strong>Rapports</strong> pour livrer → <strong>Shortlists</strong>
          pour organiser vos cibles.
        </>
      ),
      bullets: [
        'Cochez « Ne plus afficher » pour ne plus le voir au chargement',
        'Le bouton « Guide » en haut à droite le rouvre à tout moment',
      ],
    },
  ]
}
