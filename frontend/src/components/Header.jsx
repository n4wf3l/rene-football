import { NavLink, Link } from 'react-router-dom'
import { useState } from 'react'
import './Header.css'

function Header() {
  const [open, setOpen] = useState(false)

  const closeMenu = () => setOpen(false)

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" onClick={closeMenu}>
          <span className="brand-mark">R</span>
          <span className="brand-name">
            Rene <span className="brand-accent">Football</span>
          </span>
        </Link>

        <button
          type="button"
          className={`burger ${open ? 'is-open' : ''}`}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`main-nav ${open ? 'is-open' : ''}`}>
          <NavLink to="/" end onClick={closeMenu}>Accueil</NavLink>
          <NavLink to="/joueurs" onClick={closeMenu}>Joueurs</NavLink>
          <NavLink to="/actualites" onClick={closeMenu}>Actualités</NavLink>
          <NavLink to="/a-propos" onClick={closeMenu}>À propos</NavLink>
          <NavLink to="/contact" onClick={closeMenu} className="nav-cta">Contact</NavLink>
        </nav>
      </div>
    </header>
  )
}

export default Header
