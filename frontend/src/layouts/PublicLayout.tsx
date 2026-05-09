import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

function PublicLayout() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-stone-50 dark:bg-zinc-950">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default PublicLayout
