import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiSend, FiImage, FiSmile, FiArrowLeft, FiMoreVertical } from 'react-icons/fi';

function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-ET', { weekday: 'long', month: 'short', day: 'numeric' });
}

function shouldShowDate(current, previous) {
  if (!previous) return true;
  return new Date(current).toDateString() !== new Date(previous).toDateString();
}

export default function ChatWindow({
  messages = [],
  currentUserId = '',
  recipient = {},
  isTyping = false,
  onSendMessage = () => {},
  onSendImage = () => {},
  onBack = null,
  isLoading = false,
  className = '',
}) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (isTyping) scrollToBottom();
  }, [isTyping, scrollToBottom]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
      inputRef.current?.focus();
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendImage(file);
      e.target.value = '';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-1 rounded-lg hover:bg-gray-100 md:hidden">
            <FiArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <div className="relative">
          {recipient.avatar ? (
            <img src={recipient.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">
              {recipient.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          {recipient.online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{recipient.name || 'Unknown'}</p>
          <p className="text-xs text-gray-400">
            {isTyping ? (
              <span className="text-green-600">Typing...</span>
            ) : recipient.online ? 'Online' : 'Offline'}
          </p>
        </div>
        <button className="p-2 rounded-lg hover:bg-gray-100">
          <FiMoreVertical className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <FiSmile className="w-7 h-7 text-green-300" />
            </div>
            <p className="text-sm text-gray-500">Start the conversation!</p>
            <p className="text-xs text-gray-400 mt-1">Send a message to {recipient.name || 'the landlord'}</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.senderId === currentUserId;
            const showDate = shouldShowDate(msg.createdAt, messages[i - 1]?.createdAt);

            return (
              <React.Fragment key={msg.id || i}>
                {showDate && (
                  <div className="flex items-center justify-center py-3">
                    <span className="px-3 py-1 bg-gray-200/60 text-gray-500 text-xs rounded-full">
                      {formatDateHeader(msg.createdAt)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div
                    className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl ${
                      isMine
                        ? 'bg-green-700 text-white rounded-br-md'
                        : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                    }`}
                  >
                    {msg.type === 'image' && msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="Shared image"
                        className="max-w-full rounded-lg mb-2 cursor-pointer"
                        onClick={() => window.open(msg.imageUrl, '_blank')}
                      />
                    )}
                    {msg.text && (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                    <p
                      className={`text-[10px] mt-1 text-right ${
                        isMine ? 'text-green-200' : 'text-gray-400'
                      }`}
                    >
                      {formatMsgTime(msg.createdAt)}
                      {isMine && msg.read && ' ✓✓'}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start mb-1">
            <div className="bg-white shadow-sm px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <FiImage className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 bg-gray-100 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-200 focus:bg-white transition-all max-h-32"
              style={{ minHeight: '42px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim()}
            className="p-2.5 bg-green-700 text-white rounded-xl hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all flex-shrink-0"
          >
            <FiSend className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
