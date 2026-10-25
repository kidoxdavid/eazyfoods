import { useEffect, useState } from 'react'
import { makeHttp } from '../../http'

const { raw } = makeHttp('vendor')

/** The store these pages work on: the one chosen in the portal (stores can have several), else the first. */
export function useStore() {
  const [store, setStore] = useState(null)
  useEffect(() => {
    raw('GET', '/vendor/stores').then((list) => {
      const saved = localStorage.getItem('ez_vendor_store')
      setStore(list.find((s) => s.id === saved) ?? list.find((s) => s.kind === 'kitchen') ?? list[0] ?? null)
    }).catch(() => setStore(null))
  }, [])
  return store
}
export { raw }
