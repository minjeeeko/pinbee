import { useEffect, useState } from 'react'

export function parseHash(hash: string) {
  const clean = hash.replace(/^#\/?/, '')
  const [pathPart, queryPart] = clean.split('?')
  const segments = pathPart.split('/').filter(Boolean)
  const query = new URLSearchParams(queryPart ?? '')
  return { segments, query, path: '/' + segments.join('/') }
}

export function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/')
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return parseHash(hash)
}

export function navigate(path: string, replace = false) {
  const target = path.startsWith('#') ? path : `#${path}`
  if (replace) window.location.replace(target)
  else window.location.hash = target
}

export function goBack() {
  if (window.history.length > 1) window.history.back()
  else navigate('/')
}
