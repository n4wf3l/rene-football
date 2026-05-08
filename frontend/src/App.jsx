import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import HomePage from './pages/HomePage'
import PlaceholderPage from './pages/PlaceholderPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route
            path="joueurs"
            element={
              <PlaceholderPage
                title="Nos joueurs"
                description="La liste de nos joueurs représentés sera bientôt disponible."
              />
            }
          />
          <Route
            path="actualites"
            element={
              <PlaceholderPage
                title="Actualités"
                description="Transferts, signatures et nouvelles de nos joueurs."
              />
            }
          />
          <Route
            path="a-propos"
            element={
              <PlaceholderPage
                title="À propos de Rene Football"
                description="Découvrez l'histoire et les valeurs de notre agence."
              />
            }
          />
          <Route
            path="contact"
            element={
              <PlaceholderPage
                title="Nous contacter"
                description="Formulaire de contact à venir."
              />
            }
          />
          <Route
            path="mentions-legales"
            element={
              <PlaceholderPage
                title="Mentions légales"
                description="Informations légales à venir."
              />
            }
          />
          <Route
            path="confidentialite"
            element={
              <PlaceholderPage
                title="Politique de confidentialité"
                description="Politique de confidentialité à venir."
              />
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
