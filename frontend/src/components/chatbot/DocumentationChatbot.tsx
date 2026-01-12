'use client'

import { useDocumentationChat } from '@/hooks/useDocumentationChat'
import { ChatBubble } from './ChatBubble'
import { ChatWindow } from './ChatWindow'

export function DocumentationChatbot() {
  const {
    isOpen,
    messages,
    isLoading,
    error,
    toggleChat,
    closeChat,
    sendMessage,
    clearMessages,
    clearError
  } = useDocumentationChat()

  return (
    <>
      {isOpen && (
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          error={error}
          onClose={closeChat}
          onSendMessage={sendMessage}
          onClearMessages={clearMessages}
          onClearError={clearError}
        />
      )}
      <ChatBubble isOpen={isOpen} onClick={toggleChat} />
    </>
  )
}
