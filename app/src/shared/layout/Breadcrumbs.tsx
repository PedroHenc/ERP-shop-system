import { RiArrowRightSLine } from '@remixicon/react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useMatches } from 'react-router'
import { isRouteHandle, type Crumb } from '@/app/route-handle'

export function Breadcrumbs() {
  const { t } = useTranslation()
  const matches = useMatches()
  let crumbs: Crumb[] = []
  for (const match of matches) {
    if (isRouteHandle(match.handle)) crumbs = match.handle.crumbs
  }
  if (crumbs.length === 0) return null

  return (
    <nav aria-label={t('breadcrumb.label')} className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          const label = t(crumb.labelKey)
          return (
            <Fragment key={`${crumb.labelKey}-${index}`}>
              {index > 0 && (
                <li role="presentation" aria-hidden="true" className="flex shrink-0">
                  <RiArrowRightSLine className="text-muted-foreground size-4" />
                </li>
              )}
              <li className="min-w-0 truncate">
                {last ? (
                  <span aria-current="page" className="text-foreground font-medium">
                    {label}
                  </span>
                ) : crumb.to ? (
                  <Link to={crumb.to} className="text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{label}</span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
