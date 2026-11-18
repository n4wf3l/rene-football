import RFLoader from './RFLoader'

/* Suspense fallback for lazy routes: the animated RF monogram, centered.
   It waits a beat before appearing so a page that loads instantly never
   flashes a loader. No layout shift: the header and footer stay mounted. */
function RouteFallback() {
  return (
    <div className="relative min-h-[40vh] flex items-center justify-center">
      <RFLoader size={64} delay={150} />
    </div>
  )
}

export default RouteFallback
