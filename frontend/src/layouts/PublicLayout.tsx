import { Outlet } from 'react-router-dom'
import CookieNotice from '../components/CookieNotice'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FooterNav from '../components/FooterNav'
import PageTransition from '../components/PageTransition'

function PublicLayout() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-stone-50 dark:bg-zinc-950">
      <Header />
      <main className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
      <FooterNav />
      <CookieNotice />
    </div>
  )
}

export default PublicLayout
