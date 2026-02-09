import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, User, Users, X } from 'lucide-react'
import api from '../services/api'

const Chat = () => {
  const [selectedConversation, setSelectedConversation] = useState(null) // 'admin' or driver_id
  const [recipientType, setRecipientType] = useState(null) // 'admin' or 'driver'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [drivers, setDrivers] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchDrivers()
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

  const fetchDrivers = async () => {
    try {
      // Fetch drivers from vendor's deliveries
      const deliveriesResponse = await api.get('/vendor/deliveries')
      const deliveries = deliveriesResponse.data || []
      
      // Extract unique drivers from deliveries
      const driverMap = new Map()
      deliveries.forEach(delivery => {
        if (delivery.driver_id && delivery.driver_name) {
          if (!driverMap.has(delivery.driver_id)) {
            driverMap.set(delivery.driver_id, {
              id: delivery.driver_id,
              name: delivery.driver_name,
              phone: delivery.driver_phone
            })
          }
        }
      })
      
      setDrivers(Array.from(driverMap.values()))
    } catch (error) {
      console.error('Failed to fetch drivers:', error)
      // Try alternative: fetch from chat messages to get drivers we've chatted with
      try {
        const messagesResponse = await api.get('/vendor/chat/messages', { params: { recipient_type: 'driver' } })
        const messages = messagesResponse.data || []
        const driverMap = new Map()
        messages.forEach(msg => {
          if (msg.sender_type === 'driver' && msg.sender_id) {
            if (!driverMap.has(msg.sender_id)) {
              driverMap.set(msg.sender_id, {
                id: msg.sender_id,
                name: 'Driver',
                phone: null
              })
            }
          }
        })
        setDrivers(Array.from(driverMap.values()))
      } catch (err) {
        console.error('Failed to fetch drivers from messages:', err)
        setDrivers([])
      }
    }
  }

  const fetchMessages = async () => {
    if (!selectedConversation || !recipientType) return
    
    setIsLoading(true)
    try {
      const params = { recipient_type: recipientType }
      if (recipientType === 'driver' && selectedConversation !== 'driver') {
        params.recipient_id = selectedConversation
      }
      
      const response = await api.get('/vendor/chat/messages', { params })
      const fetchedMessages = response.data.map((msg) => ({
        id: msg.id,
        text: msg.message,
        sender: msg.sender_type === 'vendor' ? 'user' : recipientType,
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
      const payload = {
        message: messageText,
        recipient_type: recipientType
      }
      
      // Only include recipient_id for driver conversations (not for admin)
      if (recipientType === 'driver' && selectedConversation && selectedConversation !== 'driver') {
        payload.recipient_id = selectedConversation
      }
      // For admin, explicitly don't include recipient_id (it should be null/undefined)
      
      console.log('Sending message with payload:', payload)
      const response = await api.post('/vendor/chat/messages', payload)
      console.log('Message sent successfully:', response.data)
      
      setTimeout(() => {
        fetchMessages()
      }, 500)
    } catch (error) {
      console.error('Chat error:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to send message. Please try again.'
      alert(errorMessage)
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
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Chat</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Communicate with admin and drivers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 h-[calc(100vh-10rem)] sm:h-[calc(100vh-12rem)]">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Admin Chat */}
            <button
              onClick={() => selectConversation('admin')}
              className={`w-full text-left p-3 sm:p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                selectedConversation === 'admin' && recipientType === 'admin' ? 'bg-primary-50 border-primary-200' : ''
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">Admin Support</p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Get help and support</p>
                </div>
              </div>
            </button>

            {/* Drivers */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Drivers</p>
            </div>
            {drivers.length > 0 ? (
              drivers.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => selectConversation('driver', driver.id)}
                  className={`w-full text-left p-3 sm:p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    selectedConversation === driver.id && recipientType === 'driver' ? 'bg-primary-50 border-primary-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">{driver.name || driver.email || 'Driver'}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">{driver.phone || 'No phone'}</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500">No drivers available</div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    recipientType === 'admin' ? 'bg-primary-100' : 'bg-blue-100'
                  }`}>
                    {recipientType === 'admin' ? (
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
                    ) : (
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                      {recipientType === 'admin' ? 'Admin Support' : 'Driver'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">Active now</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
                {isLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-xs sm:text-sm text-gray-500">Loading messages...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <MessageCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-xs sm:text-sm">No messages yet. Start a conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.sender !== 'user' && (
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          recipientType === 'admin' ? 'bg-primary-100' : 'bg-blue-100'
                        }`}>
                          {recipientType === 'admin' ? (
                            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-600" />
                          ) : (
                            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] sm:max-w-[75%] rounded-lg px-3 sm:px-4 py-2 ${
                          message.sender === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.text}</p>
                        <p className={`text-[10px] sm:text-xs mt-1 ${
                          message.sender === 'user' ? 'text-primary-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {message.sender === 'user' && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isSending && (
                  <div className="flex gap-2 justify-end">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
                    </div>
                    <div className="bg-primary-600 text-white rounded-lg px-3 sm:px-4 py-2">
                      <p className="text-xs sm:text-sm">Sending...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-white rounded-b-lg">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isSending}
                    className="px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 p-4">
                <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-400" />
                <p className="text-sm sm:text-base lg:text-lg font-medium">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chat

