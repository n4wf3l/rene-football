import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import RequireAdmin from './auth/RequireAdmin'
import { RequirePermission } from './auth/permissions'
import { ThemeProvider } from './theme/ThemeContext'
import PublicLayout from './layouts/PublicLayout'
import HomePage from './pages/HomePage'
import PlaceholderPage from './pages/PlaceholderPage'
import NotFoundPage from './pages/NotFoundPage'
import RouteFallback from './components/RouteFallback'
import ScrollToTop from './components/ScrollToTop'
import TopLoadingBar from './components/TopLoadingBar'

/* Lazy public routes - kept off the initial bundle. HomePage stays eager
   so the landing first-paint is fast. */
const PlayersPage        = lazy(() => import('./pages/PlayersPage'))
const PlayerProfilePage  = lazy(() => import('./pages/PlayerProfilePage'))
const ContactPage        = lazy(() => import('./pages/ContactPage'))
const ActualitesPage     = lazy(() => import('./pages/ActualitesPage'))
const ArticleDetailPage  = lazy(() => import('./pages/ArticleDetailPage'))
const AProposPage        = lazy(() => import('./pages/AProposPage'))
const PublicPresentationPage = lazy(() => import('./pages/PublicPresentationPage'))
const MentionsLegales    = lazy(() => import('./pages/legal/MentionsLegales'))
const Confidentialite    = lazy(() => import('./pages/legal/Confidentialite'))
const CookiesPage        = lazy(() => import('./pages/legal/Cookies'))

/* Admin shell + pages: never loaded for public visitors. */
const AdminLayout    = lazy(() => import('./layouts/AdminLayout'))
const AdminLogin     = lazy(() => import('./pages/admin/AdminLogin'))
const AdminForgotPassword = lazy(() => import('./pages/admin/AdminForgotPassword'))
const AdminResetPassword  = lazy(() => import('./pages/admin/AdminResetPassword'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminPlayers     = lazy(() => import('./pages/admin/AdminPlayers'))
const AdminPlayerEdit  = lazy(() => import('./pages/admin/AdminPlayerEdit'))
const AdminAnalysis    = lazy(() => import('./pages/admin/AdminAnalysis'))
const AdminArticles    = lazy(() => import('./pages/admin/AdminArticles'))
const AdminArticleEdit = lazy(() => import('./pages/admin/AdminArticleEdit'))
const AdminScouting    = lazy(() => import('./pages/admin/AdminScouting'))
const AdminSportHome = lazy(() => import('./pages/admin/AdminSportHome'))
const AdminMarketIntelligence = lazy(() => import('./pages/admin/AdminMarketIntelligence'))
const AdminStaff       = lazy(() => import('./pages/admin/AdminStaff'))
const AdminStaffEdit   = lazy(() => import('./pages/admin/AdminStaffEdit'))
const AdminPresentations    = lazy(() => import('./pages/admin/AdminPresentations'))
const AdminPresentationEdit = lazy(() => import('./pages/admin/AdminPresentationEdit'))
const AdminAnnouncement = lazy(() => import('./pages/admin/AdminAnnouncement'))
const AdminContact          = lazy(() => import('./pages/admin/AdminContact'))
const AdminSettings         = lazy(() => import('./pages/admin/AdminSettings'))
const AdminPartners         = lazy(() => import('./pages/admin/AdminPartners'))
const AdminFrequentation    = lazy(() => import('./pages/admin/AdminFrequentation'))
const AdminMembers          = lazy(() => import('./pages/admin/AdminMembers'))

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <TopLoadingBar />
          <ScrollToTop />
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
                <Route path="mentions-legales" element={<MentionsLegales />} />
                <Route path="confidentialite" element={<Confidentialite />} />
                <Route path="cookies" element={<CookiesPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Public presentation landing (no site layout - shareable link for clubs) */}
              <Route path="/p/:token" element={<PublicPresentationPage />} />

              {/* Admin login (no layout) */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/mot-de-passe-oublie" element={<AdminForgotPassword />} />
              <Route path="/admin/reinitialiser" element={<AdminResetPassword />} />

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
                <Route path="analyse" element={<RequirePermission need="analysis"><AdminAnalysis /></RequirePermission>} />
                <Route path="frequentation" element={<AdminFrequentation />} />
                <Route path="articles" element={<AdminArticles />} />
                <Route path="articles/nouveau" element={<AdminArticleEdit creating />} />
                <Route path="articles/:slug/edit" element={<AdminArticleEdit />} />
                <Route path="sportif" element={<AdminSportHome />} />
                <Route path="scouting" element={<RequirePermission need="scouting"><AdminScouting /></RequirePermission>} />
                <Route path="recherche" element={<AdminMarketIntelligence />} />
                <Route path="equipe" element={<AdminStaff />} />
                <Route path="equipe/nouveau" element={<AdminStaffEdit creating />} />
                <Route path="equipe/:slug/edit" element={<AdminStaffEdit />} />
                <Route path="presentations" element={<AdminPresentations />} />
                <Route path="presentations/nouvelle" element={<AdminPresentationEdit creating />} />
                <Route path="presentations/annonce" element={<AdminAnnouncement />} />
                <Route path="presentations/:id/edit" element={<AdminPresentationEdit />} />
                <Route path="contact" element={<AdminContact />} />
                <Route path="reglages" element={<AdminSettings />} />
                <Route path="partenaires" element={<AdminPartners />} />
                <Route path="membres" element={<RequirePermission need="members"><AdminMembers /></RequirePermission>} />
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
