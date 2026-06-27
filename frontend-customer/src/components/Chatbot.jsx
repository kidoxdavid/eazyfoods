import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, ShoppingCart, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { resolveImageUrl } from '../utils/imageUtils'
import { useCart } from '../contexts/CartContext'

const QUICK_PROMPTS = [
  "What do I need for jollof rice?",
  "Show me ingredients for egusi soup",
  "I want to make puff puff",
  "What spices do I need for suya?",
  "Suggest a meal plan for this week",
]

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
      <button
        onClick={() => onAdd(product)}
        className="flex-shrink-0 w-7 h-7 bg-primary-600 text-white rounded-lg flex items-center justify-center hover:bg-primary-700 transition-colors"
        title="Add to cart"
      >
        <ShoppingCart className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1 px-3 py-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

const Chatbot = () => {
  const { addToCart } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
    if (isOpen && messages.length === 0) {
      // Welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        text: "Hi! I'm EazyBot 👋 — your AI shopping assistant. Ask me what you need to cook any dish, and I'll find the ingredients for you!",
        products: [],
        suggestions: QUICK_PROMPTS.slice(0, 3),
      }])
    }
  }, [isOpen])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || isTyping) return
    setInput('')

    const userMsg = { id: Date.now(), role: 'user', text: msg }
    setMessages(prev => [...prev, userMsg])
    setIsTyping(true)

    // Build history for the API
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
      }])
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail || ''
      const text = status === 503
        ? "The AI assistant isn't configured yet. If you're the site owner, add your ANTHROPIC_API_KEY in the Render environment settings."
        : status === 429
        ? "Too many requests — please wait a moment and try again."
        : "Sorry, I couldn't reach the AI right now. Please try again in a moment."
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        text,
        products: [],
        suggestions: [],
      }])
    }
    setIsTyping(false)
  }

  const handleAdd = async (product) => {
    try {
      await addToCart({ ...product, quantity: 1 })
    } catch {}
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-xl hover:bg-primary-700 flex items-center justify-center z-40 transition-all hover:scale-110 group"
        aria-label="Open AI assistant"
      >
        <Bot className="h-6 w-6 group-hover:scale-110 transition-transform" />
        {/* Pulse dot */}
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[580px] bg-black/50 sm:bg-transparent flex items-end sm:items-stretch justify-center sm:justify-start z-50 sm:block">
      <div className="w-full max-w-md sm:w-[380px] h-[88vh] sm:h-[580px] bg-white flex flex-col shadow-2xl rounded-t-2xl sm:rounded-2xl border border-gray-200 overflow-hidden">

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
            <p className="text-primary-100 text-xs">AI Shopping Assistant</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0">
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
              <div className="max-w-[82%] space-y-2">
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Product cards */}
                {msg.products?.length > 0 && (
                  <div className="space-y-1.5">
                    {msg.products.map(p => (
                      <ProductCard key={p.id} product={p} onAdd={handleAdd} />
                    ))}
                    <Link
                      to="/groceries"
                      className="block text-center text-xs text-primary-600 font-semibold py-1.5 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
                    >
                      Browse all groceries →
                    </Link>
                  </div>
                )}

                {/* Suggestion chips */}
                {msg.suggestions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestions.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)}
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

        {/* Quick prompts (only when just welcome message showing) */}
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
              placeholder="Ask me anything about food…"
              className="flex-1 min-h-[40px] px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm resize-none bg-gray-50 focus:bg-white transition-colors outline-none"
              disabled={isTyping}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0"
            >
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
