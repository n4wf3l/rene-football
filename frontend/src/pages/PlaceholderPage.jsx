import { Link } from 'react-router-dom'

function PlaceholderPage({ title, description }) {
  return (
    <section className="container section">
      <div className="section-head">
        <span className="eyebrow">Bientôt disponible</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Link to="/" className="btn btn-primary">Retour à l'accueil</Link>
      </div>
    </section>
  )
}

export default PlaceholderPage
