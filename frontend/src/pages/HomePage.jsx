import { Link } from 'react-router-dom'
import './HomePage.css'

const services = [
  {
    icon: '⚽',
    title: 'Représentation de joueurs',
    text: 'Nous accompagnons chaque joueur dans sa carrière, du jeune talent au professionnel confirmé.',
  },
  {
    icon: '📝',
    title: 'Négociation de contrats',
    text: 'Notre expertise juridique garantit les meilleures conditions pour chaque transfert et signature.',
  },
  {
    icon: '🔍',
    title: 'Scouting & recrutement',
    text: 'Un réseau international pour détecter les talents et connecter clubs et joueurs.',
  },
  {
    icon: '📈',
    title: 'Gestion de carrière',
    text: 'Conseil stratégique, image, sponsoring : nous pensons à long terme.',
  },
]

const stats = [
  { value: '120+', label: 'Joueurs représentés' },
  { value: '15', label: 'Années d\'expérience' },
  { value: '40+', label: 'Clubs partenaires' },
  { value: '12', label: 'Pays couverts' },
]

function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-bg" aria-hidden="true"></div>
        <div className="container hero-inner">
          <span className="hero-badge">Agence de football</span>
          <h1 className="hero-title">
            Nous façonnons les <span className="accent">carrières</span><br />
            qui marquent le football.
          </h1>
          <p className="hero-text">
            Rene Football accompagne joueurs, clubs et talents émergents
            avec une approche personnalisée, de la signature du premier
            contrat au sommet de la carrière professionnelle.
          </p>
          <div className="hero-actions">
            <Link to="/joueurs" className="btn btn-primary">Découvrir nos joueurs</Link>
            <Link to="/contact" className="btn btn-ghost">Nous contacter</Link>
          </div>

          <div className="hero-stats">
            {stats.map((s) => (
              <div key={s.label} className="stat">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <span className="eyebrow">Nos services</span>
          <h2>Une expertise complète au service du football</h2>
          <p>De la détection à la fin de carrière, chaque étape est pensée pour faire grandir nos joueurs.</p>
        </div>

        <div className="services-grid">
          {services.map((s) => (
            <article key={s.title} className="service-card">
              <div className="service-icon" aria-hidden="true">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="container cta-inner">
          <div>
            <h2>Vous êtes joueur ou club ?</h2>
            <p>Échangeons sur votre projet. Notre équipe revient vers vous sous 48 heures.</p>
          </div>
          <Link to="/contact" className="btn btn-primary">Prendre contact</Link>
        </div>
      </section>
    </>
  )
}

export default HomePage
