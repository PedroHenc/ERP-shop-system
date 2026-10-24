import { useIsFetching } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigation } from 'react-router'

export function NavigationProgress() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const loadingFirstData = useIsFetching({ predicate: (query) => query.state.data === undefined }) > 0
  if (navigation.state === 'idle' && !loadingFirstData) return null
  return (
    <div
      role="progressbar"
      aria-label={t('loading')}
      className="bg-primary fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse"
    />
  )
}
