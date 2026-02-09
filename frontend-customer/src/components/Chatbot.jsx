import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, User, Headphones } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const Chatbot = () => {
  const { token } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && token) {
      fetchMessages()
    }
  }, [isOpen, token])

  const fetchMessages = async () => {
    if (!token) return
    
    setIsLoading(true)
    try {
      const response = await api.get('/customer/chat/messages')
      const fetchedMessages = response.data.map((msg) => ({
        id: msg.id,
        text: msg.message,
        sender: msg.sender_type === 'customer' ? 'user' : 'admin',
        timestamp: new Date(msg.created_at)
      }))
      setMessages(fetchedMessages)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !token || isSending) return

    const userMessage = {
      id: Date.now(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const messageText = input.trim()
    setInput('')
    setIsSending(true)

    try {
      await api.post('/customer/chat/messages', {
        message: messageText,
        recipient_type: 'admin'
      })
      
      // Optionally refresh messages to get any admin response
      // For real-time, you'd want WebSockets, but for now we'll poll or refresh
      setTimeout(() => {
        fetchMessages()
      }, 1000)
    } catch (error) {
      console.error('Chat error:', error)
      // Show error message
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, failed to send message. Please try again.",
        sender: 'admin',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 flex items-center justify-center z-40 transition-all duration-300 hover:scale-110 md:bottom-6"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    )
  }

  // Mobile-friendly: modal on small devices, fixed window on larger
  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-96 sm:h-[600px] bg-black/50 sm:bg-transparent flex items-center justify-center z-50 sm:block">
      <div className="w-[95%] max-w-md h-[85vh] max-h-[600px] bg-white flex flex-col shadow-2xl rounded-lg border border-gray-200 sm:w-96 sm:h-[600px] sm:rounded-lg">
      {/* Header */}
      <div className="bg-primary-600 text-white p-4 sm:rounded-t-lg flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5" />
          <h3 className="font-semibold text-base sm:text-lg">Support Chat</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-primary-700 rounded-full p-1 transition-colors"
          aria-label="Close chat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Headphones className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Start a conversation with our support team</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'admin' && (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Headphones className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
                </div>
              )}
              <div
                className={`max-w-[75%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-2 ${
                  message.sender === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-primary-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.sender === 'user' && (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
        {isSending && (
          <div className="flex gap-2 justify-end">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            </div>
            <div className="bg-primary-600 text-white rounded-lg px-3 py-2 sm:px-4 sm:py-2">
              <p className="text-sm sm:text-base">Sending...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-gray-200 bg-white sm:rounded-b-lg flex-shrink-0">
        {!token ? (
          <div className="text-center text-sm text-gray-600 py-2">
            Please log in to chat with support
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isSending}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="Send message"
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Chat with our support team • We'll respond as soon as possible
            </p>
          </>
        )}
      </div>
      </div>
    </div>
  )
}

export default Chatbot
