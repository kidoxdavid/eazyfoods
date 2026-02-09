import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, User, Users, Building2, Truck } from 'lucide-react'
import api from '../services/api'

const Chat = () => {
  const [selectedConversation, setSelectedConversation] = useState(null) // recipient_id
  const [recipientType, setRecipientType] = useState(null) // 'customer', 'vendor', or 'driver'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [conversations, setConversations] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation && recipientType) {
      fetchMessages()
    }
  }, [selectedConversation, recipientType])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async () => {
    try {
      const response = await api.get('/admin/chat/conversations')
      setConversations(response.data || [])
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
      setConversations([])
    }
  }

  const fetchMessages = async () => {
    if (!selectedConversation || !recipientType) return
    
    setIsLoading(true)
    try {
      const params = {
        recipient_type: recipientType,
        recipient_id: selectedConversation
      }
      
      const response = await api.get('/admin/chat/messages', { params })
      const fetchedMessages = response.data.map((msg) => ({
        id: msg.id,
        text: msg.message,
        sender: msg.sender_type === 'admin' ? 'user' : recipientType,
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
    if (!input.trim() || !selectedConversation || !recipientType || isSending) return

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
      await api.post('/admin/chat/messages', {
        message: messageText,
        recipient_type: recipientType,
        recipient_id: selectedConversation
      })
      
      setTimeout(() => {
        fetchMessages()
      }, 500)
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
      alert('Failed to send message. Please try again.')
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

  const selectConversation = (type, id) => {
    setRecipientType(type)
    setSelectedConversation(id)
    setMessages([])
  }

  const getIcon = (type) => {
    switch (type) {
      case 'customer':
        return <User className="h-5 w-5 text-blue-600" />
      case 'vendor':
        return <Building2 className="h-5 w-5 text-green-600" />
      case 'driver':
        return <Truck className="h-5 w-5 text-orange-600" />
      default:
        return <Users className="h-5 w-5 text-primary-600" />
    }
  }

  const getBgColor = (type) => {
    switch (type) {
      case 'customer':
        return 'bg-blue-100'
      case 'vendor':
        return 'bg-green-100'
      case 'driver':
        return 'bg-orange-100'
      default:
        return 'bg-primary-100'
    }
  }

  // Group conversations by type
  const conversationsByType = {
    customer: conversations.filter(c => c.type === 'customer'),
    vendor: conversations.filter(c => c.type === 'vendor'),
    driver: conversations.filter(c => c.type === 'driver')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
        <p className="text-gray-600 mt-1">Communicate with customers, vendors, and drivers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Customers */}
            {conversationsByType.customer.length > 0 && (
              <>
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">Customers</p>
                </div>
                {conversationsByType.customer.map((conv) => (
                  <button
                    key={`customer-${conv.id}`}
                    onClick={() => selectConversation('customer', conv.id)}
                    className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      selectedConversation === conv.id && recipientType === 'customer' ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">Customer</p>
                        <p className="text-sm text-gray-500 truncate">{conv.id}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Vendors */}
            {conversationsByType.vendor.length > 0 && (
              <>
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">Vendors</p>
                </div>
                {conversationsByType.vendor.map((conv) => (
                  <button
                    key={`vendor-${conv.id}`}
                    onClick={() => selectConversation('vendor', conv.id)}
                    className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      selectedConversation === conv.id && recipientType === 'vendor' ? 'bg-green-50 border-green-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{conv.name || 'Vendor'}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {conv.email || conv.id}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Drivers */}
            {conversationsByType.driver.length > 0 && (
              <>
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">Drivers</p>
                </div>
                {conversationsByType.driver.map((conv) => (
                  <button
                    key={`driver-${conv.id}`}
                    onClick={() => selectConversation('driver', conv.id)}
                    className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      selectedConversation === conv.id && recipientType === 'driver' ? 'bg-orange-50 border-orange-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Truck className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">Driver</p>
                        <p className="text-sm text-gray-500 truncate">{conv.id}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {conversations.length === 0 && (
              <div className="p-4 text-sm text-gray-500">No conversations yet</div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getBgColor(recipientType)}`}>
                    {getIcon(recipientType)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{recipientType}</p>
                    <p className="text-sm text-gray-500">Active now</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {isLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">Loading messages...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No messages yet. Start a conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.sender !== 'user' && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getBgColor(recipientType)}`}>
                          {getIcon(recipientType)}
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          message.sender === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === 'user' ? 'text-primary-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {message.sender === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-primary-600" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isSending && (
                  <div className="flex gap-2 justify-end">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="bg-primary-600 text-white rounded-lg px-4 py-2">
                      <p className="text-sm">Sending...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isSending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chat

