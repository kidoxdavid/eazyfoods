import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, ShoppingCart, Sparkles, UtensilsCrossed, Check, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { resolveImageUrl } from '../utils/imageUtils'
import { useCart } from '../contexts/CartContext'

const QUICK_PROMPTS = [
  "What do I need for jollof rice?",
  "Build me a weekend meal plan",
  "Ingredients for egusi soup",
  "Christmas meal plan for 3 days",
  "Help me plan my week's meals",
]

const MEAL_EMOJI = { breakfast: '🌅', lunch: '🌞', dinner: '🌙' }

// ── Product card ───────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd }) {
  const img = resolveImageUrl(product.image_url)
  return (
    <div className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-xl p-2 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
        {img
          ? <img src={img} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-lg">🛒</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{product.name}</p>
        <p className="text-xs text-primary-600 font-bold">${product.price?.toFixed(2)}</p>
      </div>
      <button onClick={() => onAdd(product)}
        className="flex-shrink-0 w-7 h-7 bg-primary-600 text-white rounded-lg flex items-center justify-center hover:bg-primary-700 transition-colors">
        <ShoppingCart className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── Meal plan card ─────────────────────────────────────────────────────────────
function MealPlanCard({ plan, onAddToCart, adding, added }) {
  const [expanded, setExpanded] = useState(false)
  const PLAN_LABEL = { one_day: '1-Day Plan', one_week: 'Weekly Plan', one_month: 'Monthly Plan' }

  return (
    <div className="bg-white border border-primary-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary-200 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{plan.name}</p>
            <p className="text-primary-200 text-[10px]">{PLAN_LABEL[plan.plan_type] || plan.plan_type} • {plan.day_count} day{plan.day_count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {plan.description && (
          <p className="text-primary-100 text-[11px] mt-1.5 leading-snug">{plan.description}</p>
        )}
      </div>

      {/* Days preview */}
      <div className="p-3 space-y-2">
        {(expanded ? plan.days : plan.days.slice(0, 2)).map(day => (
          <div key={day.day_number} className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-xs font-bold text-gray-700 mb-1.5">{day.label}</p>
            <div className="space-y-1">
              {['breakfast', 'lunch', 'dinner'].map(mt => {
                const meal = day.meals.find(m => m.meal_type === mt)
                if (!meal) return null
                return (
                  <div key={mt} className="flex items-center gap-1.5">
                    <span className="text-sm">{MEAL_EMOJI[mt]}</span>
                    <div className="min-w-0">
                      <span className="text-[10px] text-gray-400 capitalize">{mt}: </span>
                      <span className="text-[11px] text-gray-700 font-medium">{meal.recipe_name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {plan.days.length > 2 && (
          <button onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1 text-xs text-primary-600 font-semibold py-1 hover:bg-primary-50 rounded-lg transition-colors">
            {expanded
              ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
              : <><ChevronDown className="h-3.5 w-3.5" /> See all {plan.days.length} days</>
            }
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2">
        <button onClick={() => onAddToCart(plan)} disabled={adding || added}
          className={`flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            added ? 'bg-green-500 text-white' : adding ? 'bg-primary-400 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}>
          {added ? <><Check className="h-3.5 w-3.5" /> Added to cart!</>
           : adding ? 'Adding…'
           : <><ShoppingCart className="h-3.5 w-3.5" /> Add all to cart</>
          }
        </button>
        <Link to="/meals"
          className="flex items-center justify-center px-3 h-9 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          View Plans
        </Link>
      </div>
    </div>
  )
}

// ── Typing dots ────────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-1 px-3 py-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

// ── Main chatbot ───────────────────────────────────────────────────────────────
const Chatbot = () => {
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [planAddingId, setPlanAddingId] = useState(null)
  const [planAddedId, setPlanAddedId] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        text: "Hi! I'm EazyBot 👋 — your AI shopping assistant. Ask me what you need to cook any dish, or let me build you a meal plan for the week, Christmas, Eid, and more!",
        products: [],
        suggestions: QUICK_PROMPTS.slice(0, 3),
        meal_plan: null,
      }])
    }
  }, [isOpen])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || isTyping) return
    setInput('')

    const userMsg = { id: Date.now(), role: 'user', text: msg, products: [], suggestions: [], meal_plan: null }
    setMessages(prev => [...prev, userMsg])
    setIsTyping(true)

    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.text }))

    try {
      const res = await api.post('/ai/chat', {
        message: msg,
        conversation_history: history,
      })
      const d = res.data
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        text: d.response,
        products: d.products || [],
        suggestions: d.suggestions || [],
        meal_plan: d.meal_plan || null,
      }])
    } catch (err) {
      const status = err?.response?.status
      const text503 = "The AI assistant isn't configured yet. If you're the site owner, add your ANTHROPIC_API_KEY in the Render environment settings."
      const textGeneric = "Sorry, I couldn't reach the AI right now. Please try again in a moment."
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        text: status === 503 ? text503 : textGeneric,
        products: [],
        suggestions: [],
        meal_plan: null,
      }])
    }
    setIsTyping(false)
  }

  const handleAddProduct = async (product) => {
    try { await addToCart({ ...product, quantity: 1 }) } catch {}
  }

  const handleAddPlan = async (plan) => {
    if (planAddingId) return
    const planKey = plan.name
    setPlanAddingId(planKey)
    try {
      const meals = plan.meals.map(m => ({
        recipe_id: m.recipe_id,
        day_number: m.day_number,
        meal_type: m.meal_type,
      }))
      const res = await api.post('/customer/recipes/meal-plans/add-to-cart-from-recipes', {
        name: plan.name,
        meals,
        household_size: 2,
      })
      for (const item of res.data?.items || []) {
        if (!item.product) continue
        await addToCart({
          ...item.product,
          id: item.product.id,
          quantity: Math.max(1, Math.ceil(item.quantity)),
        })
      }
      setPlanAddedId(planKey)
      setTimeout(() => setPlanAddedId(null), 3000)
    } catch {}
    setPlanAddingId(null)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleChip = (chip) => {
    if (chip === 'View all Meal Plans' || chip === 'View Recipes & Meal Plans') navigate('/meals')
    else if (chip === 'View My Orders') navigate('/orders')
    else if (chip === 'Browse Groceries') navigate('/groceries')
    else sendMessage(chip)
  }

  // ── Closed state: floating bubble ────────────────────────────────────────
  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-xl hover:bg-primary-700 flex items-center justify-center z-40 transition-all hover:scale-110 group"
        aria-label="Open AI assistant">
        <Bot className="h-6 w-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
      </button>
    )
  }

  // ── Open state ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[390px] sm:h-[600px] bg-black/50 sm:bg-transparent flex items-end sm:items-stretch justify-center sm:justify-start z-50 sm:block">
      <div className="w-full max-w-md sm:w-[390px] h-[88vh] sm:h-[600px] bg-white flex flex-col shadow-2xl rounded-t-2xl sm:rounded-2xl border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="bg-primary-600 text-white px-4 py-3.5 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm">EazyBot</p>
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            </div>
            <p className="text-primary-100 text-xs">AI Shopping & Meal Planning Assistant</p>
          </div>
          <button onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-primary-600" />
                </div>
              )}
              <div className="max-w-[85%] space-y-2">
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Meal plan card */}
                {msg.meal_plan && (
                  <MealPlanCard
                    plan={msg.meal_plan}
                    onAddToCart={handleAddPlan}
                    adding={planAddingId === msg.meal_plan.name}
                    added={planAddedId === msg.meal_plan.name}
                  />
                )}

                {/* Product cards */}
                {!msg.meal_plan && msg.products?.length > 0 && (
                  <div className="space-y-1.5">
                    {msg.products.map(p => (
                      <ProductCard key={p.id} product={p} onAdd={handleAddProduct} />
                    ))}
                    <Link to="/groceries"
                      className="block text-center text-xs text-primary-600 font-semibold py-1.5 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors">
                      Browse all groceries →
                    </Link>
                  </div>
                )}

                {/* Suggestion chips */}
                {msg.suggestions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestions.map((s, i) => (
                      <button key={i} onClick={() => handleChip(s)}
                        className="text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors shadow-sm">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary-600" />
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts (only on welcome screen) */}
        {messages.length === 1 && (
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0 bg-gray-50" style={{ scrollbarWidth: 'none' }}>
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => sendMessage(p)}
                className="flex-shrink-0 text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors shadow-sm whitespace-nowrap">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
          <div className="flex gap-2 items-end">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything about food or meal plans…"
              className="flex-1 min-h-[40px] px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm bg-gray-50 focus:bg-white transition-colors outline-none"
              disabled={isTyping}
            />
            <button onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">Powered by Claude AI</p>
        </div>
      </div>
    </div>
  )
}

export default Chatbot
