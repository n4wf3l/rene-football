import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="container section" style={{ textAlign: 'center' }}>
      <span className="eyebrow">Erreur 404</span>
      <h2 style={{ fontSize: '2.2rem', margin: '12px 0 16px' }}>Page introuvable</h2>
      <p style={{ color: '#475569', marginBottom: 32 }}>
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Link to="/" className="btn btn-primary">Retour à l'accueil</Link>
    </section>
  )
}

export default NotFoundPage
