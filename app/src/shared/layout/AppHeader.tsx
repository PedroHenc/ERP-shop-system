import { RiStore2Line } from '@remixicon/react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@/app/auth/AuthProvider'
import { can } from '@/app/auth/permissions'
import { cn } from '@/lib/utils'
import { pillSpring } from '@/shared/motion/presets'
import { navItems } from './nav-items'
import { PreferencesMenu } from './PreferencesMenu'
import { UserMenu } from './UserMenu'

function isActivePath(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * The design's top bar: brand on the left, the main navigation centred as a pill track where one ink
 * pill slides to the current page, preferences and the user menu on the right. Below `lg` the
 * navigation drops to its own full-width row and scrolls sideways if it does not fit.
 */
export function AppHeader({ scrolled }: { scrolled: boolean }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const visibleItems = navItems.filter((item) => !item.permission || can(user?.role, item.permission))

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        'bg-background/80 sticky top-0 z-20 border-b border-transparent backdrop-blur transition-colors duration-300',
        scrolled && 'border-border',
      )}
    >
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2.5 justify-self-start rounded-full text-[17px] font-extrabold tracking-[-0.01em] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="bg-primary text-primary-foreground flex size-[38px] shrink-0 items-center justify-center rounded-full">
            <RiStore2Line className="size-5" aria-hidden="true" />
          </span>
          {t('appName')}
        </Link>

        <nav
          aria-label={t('nav.label')}
          className="col-span-2 row-start-2 flex min-w-0 justify-center lg:col-span-1 lg:col-start-2 lg:row-start-1"
        >
          <ul className="bg-card flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-full p-[5px] shadow-[var(--shadow-card)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleItems.map((item) => {
              const active = isActivePath(pathname, item.to)
              return (
                <li key={item.to} className="shrink-0">
                  <Link
                    to={item.to}
                    data-active={active}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative isolate flex h-9 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap outline-none transition-[background-color,color] duration-300 focus-visible:ring-3 focus-visible:ring-ring/50',
                      // The label turns light a beat after the pill arrives, as in the design.
                      active ? 'text-background delay-75' : 'text-foreground hover:bg-muted',
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="main-nav-pill"
                        aria-hidden="true"
                        className="bg-foreground absolute inset-0 -z-10 rounded-full"
                        transition={pillSpring}
                      />
                    ) : null}
                    {t(item.labelKey)}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5 justify-self-end">
          <PreferencesMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
