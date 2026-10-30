import { useEffect, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AnimatedOutlet } from './AnimatedOutlet'
import { AppHeader } from './AppHeader'
import { Breadcrumbs } from './Breadcrumbs'
import { NavigationProgress } from './NavigationProgress'

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrolled
}

export function AppLayout() {
  const scrolled = useScrolled()
  return (
    <TooltipProvider>
      <div className="flex min-h-svh flex-col">
        <NavigationProgress />
        <AppHeader scrolled={scrolled} />
        <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 pt-4 pb-8 lg:px-8 lg:pt-6">
          <Breadcrumbs />
          <AnimatedOutlet />
        </main>
      </div>
    </TooltipProvider>
  )
}
