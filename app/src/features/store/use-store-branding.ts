import { useEffect } from 'react'
import { useStore } from './queries'

const ICON_SIZE = 64

/** The page's icons (SVG and PNG sizes from index.html); one is created if there are none. */
function iconLinks(): HTMLLinkElement[] {
  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')]
  if (links.length > 0) return links
  const link = document.createElement('link')
  link.rel = 'icon'
  document.head.appendChild(link)
  return [link]
}

/** Points every icon at `href`; the returned function puts back what each had. */
function setIcon(href: string, type: string): () => void {
  const links = iconLinks()
  const original = links.map((link) => ({ link, href: link.getAttribute('href'), type: link.type }))
  for (const link of links) {
    link.type = type
    link.href = href
  }
  return () => {
    for (const { link, href: previous, type: previousType } of original) {
      link.type = previousType
      if (previous === null) link.removeAttribute('href')
      else link.setAttribute('href', previous)
    }
  }
}

/** The logo cropped to a circle, as the header shows it; null when the browser cannot draw it. */
async function roundIcon(logo: string): Promise<string | null> {
  const image = new Image()
  image.src = logo
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = ICON_SIZE
  canvas.height = ICON_SIZE
  const context = canvas.getContext('2d')
  if (!context) return null
  context.beginPath()
  context.arc(ICON_SIZE / 2, ICON_SIZE / 2, ICON_SIZE / 2, 0, Math.PI * 2)
  context.clip()
  context.drawImage(image, 0, 0, ICON_SIZE, ICON_SIZE)
  return canvas.toDataURL('image/png')
}

/**
 * While signed in, the browser tab shows the store's name and logo instead of the app's; leaving the
 * signed-in area (signing out) puts the app's back.
 */
export function useStoreBranding() {
  const { data: store } = useStore()
  const name = store?.name
  const logo = store?.logo ?? null

  useEffect(() => {
    if (!name) return
    const previous = document.title
    document.title = name
    return () => {
      document.title = previous
    }
  }, [name])

  useEffect(() => {
    if (!logo) return
    let current = true
    // The square logo straight away, the round one once drawn.
    const restore = setIcon(logo, logo.slice(5, logo.indexOf(';')))
    void roundIcon(logo)
      .then((round) => {
        if (current && round) setIcon(round, 'image/png')
      })
      .catch(() => undefined)
    return () => {
      current = false
      restore()
    }
  }, [logo])
}
