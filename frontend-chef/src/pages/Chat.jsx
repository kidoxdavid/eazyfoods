import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, User, Users, X } from 'lucide-react'
import api from '../services/api'

const Chat = () => {
  const [selectedConversation, setSelectedConversation] = useState(null) // 'admin'
  const [recipientType, setRecipientType] = useState(null) // 'admin'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

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

  const fetchMessages = async () => {
    if (!selectedConversation || !recipientType) return
    
    setIsLoading(true)
    try {
      const params = { recipient_type: recipientType }
      if (recipientType === 'admin' && selectedConversation !== 'admin') {
        params.recipient_id = selectedConversation
      }
      
      const response = await api.get('/chef/chat/messages', { params })
      const fetchedMessages = response.data.map((msg) => ({
        id: msg.id,
        text: msg.message,
        sender: msg.sender_type === 'chef' ? 'user' : recipientType,
        timestamp: new Date(msg.created_at)
      }))
      setMessages(fetchedMessages.reverse()) // Reverse to show oldest first
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedConversation || !recipientType) return
    
    const messageText = input.trim()
    setInput('')
    setIsSending(true)
    
    try {
      const messageData = {
        message: messageText,
        recipient_type: recipientType,
        recipient_id: recipientType === 'admin' ? null : selectedConversation
      }
      
      await api.post('/chef/chat/messages', messageData)
      
      // Refresh messages
      await fetchMessages()
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again.')
      setInput(messageText) // Restore input on error
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const selectConversation = (type, id = null) => {
    setRecipientType(type)
    setSelectedConversation(id || type)
    setMessages([])
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
        <p className="text-gray-600 mt-1">Communicate with admin support</p>
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
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Admin Support</p>
                    <p className="text-sm text-gray-500">Online</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.sender === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.sender === 'user' ? 'text-primary-100' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isSending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chat

