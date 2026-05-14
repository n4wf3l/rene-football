import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import RequireAdmin from './auth/RequireAdmin'
import { ThemeProvider } from './theme/ThemeContext'
import PublicLayout from './layouts/PublicLayout'
import HomePage from './pages/HomePage'
import PlaceholderPage from './pages/PlaceholderPage'
import NotFoundPage from './pages/NotFoundPage'
import RouteFallback from './components/RouteFallback'

/* Lazy public routes — kept off the initial bundle. HomePage stays eager
   so the landing first-paint is fast. */
const PlayersPage        = lazy(() => import('./pages/PlayersPage'))
const PlayerProfilePage  = lazy(() => import('./pages/PlayerProfilePage'))
const ContactPage        = lazy(() => import('./pages/ContactPage'))
const ActualitesPage     = lazy(() => import('./pages/ActualitesPage'))
const ArticleDetailPage  = lazy(() => import('./pages/ArticleDetailPage'))
const AProposPage        = lazy(() => import('./pages/AProposPage'))

/* Admin shell + pages: never loaded for public visitors. */
const AdminLayout    = lazy(() => import('./layouts/AdminLayout'))
const AdminLogin     = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminPlayers     = lazy(() => import('./pages/admin/AdminPlayers'))
const AdminPlayerEdit  = lazy(() => import('./pages/admin/AdminPlayerEdit'))
const AdminAnalysis    = lazy(() => import('./pages/admin/AdminAnalysis'))
const AdminArticles    = lazy(() => import('./pages/admin/AdminArticles'))
const AdminArticleEdit = lazy(() => import('./pages/admin/AdminArticleEdit'))
const AdminScouting    = lazy(() => import('./pages/admin/AdminScouting'))

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public */}
              <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="joueurs" element={<PlayersPage />} />
                <Route path="joueurs/:slug" element={<PlayerProfilePage />} />
                <Route path="actualites" element={<ActualitesPage />} />
                <Route path="actualites/:slug" element={<ArticleDetailPage />} />
                <Route path="a-propos" element={<AProposPage />} />
                <Route path="contact" element={<ContactPage />} />
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

              {/* Admin login (no layout) */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Admin (protected) */}
              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="joueurs" element={<AdminPlayers />} />
                <Route path="joueurs/nouveau" element={<AdminPlayerEdit creating />} />
                <Route path="joueurs/:slug/edit" element={<AdminPlayerEdit />} />
                <Route path="analyse" element={<AdminAnalysis />} />
                <Route path="articles" element={<AdminArticles />} />
                <Route path="articles/nouveau" element={<AdminArticleEdit creating />} />
                <Route path="articles/:slug/edit" element={<AdminArticleEdit />} />
                <Route path="scouting" element={<AdminScouting />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
