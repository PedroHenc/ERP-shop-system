import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { AppSidebar } from './AppSidebar'
import { Breadcrumbs } from './Breadcrumbs'
import { PreferencesMenu } from './PreferencesMenu'

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
  const { t } = useTranslation()
  const scrolled = useScrolled()
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header
            data-scrolled={scrolled}
            className={cn(
              'bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-transparent px-4 backdrop-blur',
              scrolled && 'border-border',
            )}
          >
            <SidebarTrigger aria-label={t('header.toggleSidebar')} />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumbs />
            <div className="ml-auto hidden items-center gap-1 md:flex">
              <PreferencesMenu />
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1400px] flex-1 p-6 lg:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
