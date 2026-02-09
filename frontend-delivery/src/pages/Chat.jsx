import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, User, Users, Building2 } from 'lucide-react'
import api from '../services/api'

const Chat = () => {
  const [selectedConversation, setSelectedConversation] = useState(null) // 'admin' or vendor_id
  const [recipientType, setRecipientType] = useState(null) // 'admin' or 'vendor'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [vendors, setVendors] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchVendors()
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

  const fetchVendors = async () => {
    try {
      // Primary: Fetch vendors from chat messages (vendors we've chatted with)
      const messagesResponse = await api.get('/driver/chat/messages')
      const messages = messagesResponse.data || []
      const vendorMap = new Map()
      
      messages.forEach(msg => {
        if (msg.sender_type === 'vendor' && msg.sender_id) {
          if (!vendorMap.has(msg.sender_id)) {
            vendorMap.set(msg.sender_id, {
              id: msg.sender_id,
              name: 'Vendor'
            })
          }
        }
        if (msg.recipient_type === 'vendor' && msg.recipient_id) {
          if (!vendorMap.has(msg.recipient_id)) {
            vendorMap.set(msg.recipient_id, {
              id: msg.recipient_id,
              name: 'Vendor'
            })
          }
        }
      })
      
      setVendors(Array.from(vendorMap.values()))
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
      setVendors([])
    }
  }

  const fetchMessages = async () => {
    if (!selectedConversation || !recipientType) return
    
    setIsLoading(true)
    try {
      const params = { recipient_type: recipientType }
      if (recipientType === 'vendor' && selectedConversation !== 'vendor') {
        params.recipient_id = selectedConversation
      }
      
      const response = await api.get('/driver/chat/messages', { params })
      const fetchedMessages = response.data.map((msg) => ({
        id: msg.id,
        text: msg.message,
        sender: msg.sender_type === 'driver' ? 'user' : recipientType,
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
      await api.post('/driver/chat/messages', {
        message: messageText,
        recipient_type: recipientType,
        recipient_id: recipientType === 'vendor' && selectedConversation !== 'vendor' ? selectedConversation : undefined
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

  const selectConversation = (type, id = null) => {
    setRecipientType(type)
    setSelectedConversation(id || type)
    setMessages([])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
        <p className="text-gray-600 mt-1">Communicate with admin and vendors</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Admin Chat */}
            <button
              onClick={() => selectConversation('admin')}
              className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                selectedConversation === 'admin' && recipientType === 'admin' ? 'bg-primary-50 border-primary-200' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">Admin Support</p>
                  <p className="text-sm text-gray-500">Get help and support</p>
                </div>
              </div>
            </button>

            {/* Vendors */}
            <div className="p-4 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Vendors</p>
            </div>
            {vendors.length > 0 ? (
              vendors.map((vendor) => (
                <button
                  key={vendor.id}
                  onClick={() => selectConversation('vendor', vendor.id)}
                  className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    selectedConversation === vendor.id && recipientType === 'vendor' ? 'bg-primary-50 border-primary-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{vendor.name || 'Vendor'}</p>
                      <p className="text-sm text-gray-500">Store</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-sm text-gray-500">No vendors available</div>
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    recipientType === 'admin' ? 'bg-primary-100' : 'bg-green-100'
                  }`}>
                    {recipientType === 'admin' ? (
                      <Users className="h-5 w-5 text-primary-600" />
                    ) : (
                      <Building2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {recipientType === 'admin' ? 'Admin Support' : 'Vendor'}
                    </p>
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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          recipientType === 'admin' ? 'bg-primary-100' : 'bg-green-100'
                        }`}>
                          {recipientType === 'admin' ? (
                            <Users className="h-4 w-4 text-primary-600" />
                          ) : (
                            <Building2 className="h-4 w-4 text-green-600" />
                          )}
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
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isSending && (
                  <div className="flex gap-2 justify-end">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-gray-600" />
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

