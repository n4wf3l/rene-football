import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="brand">
            <span className="brand-mark">R</span>
            <span className="brand-name">
              Rene <span className="brand-accent">Football</span>
            </span>
          </div>
          <p className="footer-tagline">
            Agence de football dédiée à la gestion de carrière, au scouting
            et à la représentation de joueurs professionnels.
          </p>
        </div>

        <div className="footer-col">
          <h4>Navigation</h4>
          <ul>
            <li><Link to="/">Accueil</Link></li>
            <li><Link to="/joueurs">Joueurs</Link></li>
            <li><Link to="/actualites">Actualités</Link></li>
            <li><Link to="/a-propos">À propos</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Services</h4>
          <ul>
            <li>Représentation de joueurs</li>
            <li>Négociation de contrats</li>
            <li>Scouting & recrutement</li>
            <li>Gestion de carrière</li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:contact@renefootball.com">contact@renefootball.com</a></li>
            <li><a href="tel:+33000000000">+33 0 00 00 00 00</a></li>
            <li>Paris, France</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>© {year} Rene Football. Tous droits réservés.</p>
          <div className="legal-links">
            <Link to="/mentions-legales">Mentions légales</Link>
            <Link to="/confidentialite">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
