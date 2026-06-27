import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'success', duration = 2800) => {
    const id = Date.now()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration)
  }, [])

  const success = useCallback((msg) => show(msg, 'success'), [show])
  const error   = useCallback((msg) => show(msg, 'error'), [show])
  const info    = useCallback((msg) => show(msg, 'info'), [show])

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="fixed top-0 left-0 right-0 z-[9999] flex flex-col items-center gap-2 pt-safe px-4 pointer-events-none"
           style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}>
        {toasts.map(t => (
          <div key={t.id} className={`screen-enter w-full max-w-sm px-4 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold flex items-center gap-2 ${
            t.type === 'error'   ? 'bg-red-500' :
            t.type === 'info'    ? 'bg-blue-500' : 'bg-primary-600'
          }`}>
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
