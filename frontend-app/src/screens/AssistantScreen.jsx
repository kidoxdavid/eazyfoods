import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowUp, Plus, Sparkles, CalendarDays, Check, Loader2 } from 'lucide-react'
import api from '../services/api'
import { useCart } from '../contexts/CartContext'
import { resolveImg } from '../services/imageUtils'

const STARTERS = [
  'What do I need to make egusi soup for 4?',
  'Build me a weekly meal plan for 2',
  'Plan a Christmas feast for 8 people',
  'A budget dinner under $30',
]

const WELCOME = {
  id: 'welcome', role: 'assistant', products: [], meal_plan: null,
  text: "Hi, I'm EazyBot. Tell me what you want to cook and I'll find the ingredients or build a meal plan.",
}

export default function AssistantScreen() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { addToCart } = useCart()
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [addingPlan, setAddingPlan] = useState(null)
  const [addedPlan, setAddedPlan] = useState(null)
  const endRef = useRef(null)
  const startedRef = useRef(false)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || typing) return
    setInput('')
    const history = messages.filter((m) => m.id !== 'welcome').map((m) => ({ role: m.role, content: m.text }))
    setMessages((m) => [...m, { id: Date.now(), role: 'user', text: msg, products: [], meal_plan: null }])
    setTyping(true)
    try {
      const { data } = await api.post('/ai/chat', { message: msg, conversation_history: history })
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text: data.response, products: data.products || [], meal_plan: data.meal_plan || null }])
    } catch (err) {
      const unconfigured = err?.response?.status === 503
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', products: [], meal_plan: null,
        text: unconfigured ? "The assistant isn't set up yet (no AI key on the server)." : "Sorry, I couldn't reach the assistant. Please try again." }])
    }
    setTyping(false)
  }

  // Home can hand over a first question: navigate('/assistant', { state: { ask } })
  useEffect(() => {
    if (state?.ask && !startedRef.current) { startedRef.current = true; send(state.ask) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addProduct = (p) => addToCart({ ...p, quantity: 1 }, 1).catch(() => {})

  const addPlan = async (plan) => {
    if (addingPlan) return
    setAddingPlan(plan.name)
    try {
      const { data } = await api.post('/customer/recipes/meal-plans/add-to-cart-from-recipes', {
        name: plan.name,
        meals: plan.meals.map((m) => ({ recipe_id: m.recipe_id, day_number: m.day_number, meal_type: m.meal_type })),
        household_size: 2,
      })
      for (const item of data?.items || []) {
        if (item.product) await addToCart({ ...item.product, quantity: Math.max(1, Math.ceil(item.quantity)) }, 1)
      }
      setAddedPlan(plan.name)
    } catch { /* surfaced by the cart badge not changing */ }
    setAddingPlan(null)
  }

  return (
    <div className="flex h-full flex-col bg-[#fdf8f0]">
      <header className="pt-safe flex flex-shrink-0 items-center gap-3 bg-primary-800 px-3 pb-3 pt-3 text-white">
        <button onClick={() => navigate(-1)} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-nude-300" /><p className="font-bold">EazyBot</p></div>
      </header>

      <div className="scroll-content flex-1 space-y-3 px-3 py-4">
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[88%] space-y-2 ${m.role === 'user' ? '' : 'w-full'}`}>
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'ml-auto w-fit bg-primary-700 text-white' : 'w-fit bg-white text-gray-800 shadow-sm'}`}>{m.text}</div>

              {m.products?.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white p-2 shadow-sm">
                  <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {p.image_url ? <img src={resolveImg(p.image_url)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center">🛒</div>}
                  </div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-900">{p.name}</p><p className="text-xs font-bold text-primary-700">${Number(p.price).toFixed(2)}</p></div>
                  <button onClick={() => addProduct(p)} aria-label={`Add ${p.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-700 text-white"><Plus className="h-5 w-5" /></button>
                </div>
              ))}

              {m.meal_plan && (
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="flex items-center gap-2 bg-primary-700 px-4 py-3 text-white">
                    <CalendarDays className="h-4 w-4 text-primary-200" />
                    <div className="min-w-0"><p className="truncate text-sm font-bold">{m.meal_plan.name}</p><p className="text-[11px] text-primary-200">{m.meal_plan.day_count} day{m.meal_plan.day_count !== 1 ? 's' : ''}</p></div>
                  </div>
                  <div className="space-y-2 p-3">
                    {m.meal_plan.days.slice(0, 3).map((d) => (
                      <div key={d.day_number} className="rounded-xl bg-gray-50 p-2.5">
                        <p className="mb-1 text-xs font-bold text-gray-700">{d.label}</p>
                        {d.meals.map((x) => <p key={x.order + x.meal_type} className="text-xs text-gray-600"><span className="capitalize text-gray-400">{x.meal_type}: </span>{x.recipe_name}</p>)}
                      </div>
                    ))}
                    <button onClick={() => addPlan(m.meal_plan)} disabled={!!addingPlan || addedPlan === m.meal_plan.name} className="flex w-full items-center justify-center gap-2 rounded-xl bg-nude-600 py-3 text-sm font-bold text-white disabled:opacity-60">
                      {addingPlan === m.meal_plan.name ? <Loader2 className="h-4 w-4 animate-spin" /> : addedPlan === m.meal_plan.name ? <><Check className="h-4 w-4" /> Added to cart</> : 'Add all ingredients to cart'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700">{s}</button>)}
          </div>
        )}
        {typing && <div className="w-fit rounded-2xl bg-white px-4 py-3 text-sm text-gray-400 shadow-sm">EazyBot is thinking…</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send() }} className="pb-safe flex flex-shrink-0 items-center gap-2 border-t border-gray-100 bg-white px-3 py-2.5">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about ingredients, plans, deals…" aria-label="Message" className="min-w-0 flex-1 rounded-full bg-gray-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        <button type="submit" disabled={!input.trim() || typing} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-nude-600 text-white disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>
      </form>
    </div>
  )
}
