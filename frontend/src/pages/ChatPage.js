import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiSearch, FiPlus, FiArrowLeft, FiWifi, FiWifiOff,
} from 'react-icons/fi';
import useAuth from '../hooks/useAuth';
import useWebSocket from '../hooks/useWebSocket';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { chatService } from '../services/chat';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(!!conversationId);
  const typingTimeoutRef = useRef(null);

  const { isConnected, sendMessage: wsSend } = useWebSocket('/ws/chat', {
    onMessage: useCallback((data) => {
      if (data.type === 'new_message') {
        const msg = data.message;
        if (activeConversation && msg.conversationId === activeConversation.id) {
          setMessages((prev) => [...prev, msg]);
          chatService.markAsRead(activeConversation.id).catch(() => {});
        }
        setConversations((prev) =>
          prev.map((c) =>
            c.id === msg.conversationId
              ? { ...c, lastMessage: msg.text || 'Image', lastMessageAt: msg.createdAt, unread: c.id === activeConversation?.id ? 0 : (c.unread || 0) + 1 }
              : c
          ).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
        );
      } else if (data.type === 'typing') {
        if (data.conversationId === activeConversation?.id && data.userId !== user?.id) {
          setIsTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      }
    }, [activeConversation, user?.id]),
  });

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const data = await chatService.getConversations();
      const convs = data.conversations || data.data || data || [];
      setConversations(convs);

      if (conversationId) {
        const found = convs.find((c) => c.id === conversationId);
        if (found) {
          setActiveConversation(found);
          setMobileShowChat(true);
        }
      }
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConvs(false);
    }
  }, [conversationId]);

  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMsgs(true);
    try {
      const data = await chatService.getMessages(convId, { limit: 50 });
      const msgs = data.messages || data.data || data || [];
      setMessages(msgs);
      chatService.markAsRead(convId).catch(() => {});
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread: 0 } : c))
      );
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversation?.id) {
      loadMessages(activeConversation.id);
    }
  }, [activeConversation?.id, loadMessages]);

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    setMobileShowChat(true);
    navigate(`/chat/${conv.id}`, { replace: true });
  };

  const handleSendMessage = async (text) => {
    if (!activeConversation?.id || !text.trim()) return;

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      senderId: user?.id,
      text,
      createdAt: new Date().toISOString(),
      type: 'text',
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const result = await chatService.sendMessage(activeConversation.id, { text });
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? (result.message || result) : m))
      );
      wsSend({ type: 'message', conversationId: activeConversation.id, text });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      toast.error('Failed to send message');
    }
  };

  const handleSendImage = async (file) => {
    if (!activeConversation?.id) return;
    try {
      const result = await chatService.sendImageMessage(activeConversation.id, file);
      const msg = result.message || result;
      setMessages((prev) => [...prev, msg]);
    } catch {
      toast.error('Failed to send image');
    }
  };

  const handleBack = () => {
    setMobileShowChat(false);
    setActiveConversation(null);
    navigate('/chat', { replace: true });
  };

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.propertyTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const recipient = activeConversation
    ? { name: activeConversation.name, avatar: activeConversation.avatar, online: activeConversation.online }
    : {};

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Conversation List - hidden on mobile when chat is open */}
      <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 bg-white border-r border-gray-100`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <FiWifi className="w-4 h-4 text-green-500" title="Connected" />
              ) : (
                <FiWifiOff className="w-4 h-4 text-red-400" title="Disconnected" />
              )}
              <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                <FiPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <ChatList isLoading />
          ) : (
            <ChatList
              conversations={filteredConversations}
              activeId={activeConversation?.id}
              onSelect={handleSelectConversation}
            />
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`${mobileShowChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {activeConversation ? (
          <ChatWindow
            messages={messages}
            currentUserId={user?.id}
            recipient={recipient}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
            onSendImage={handleSendImage}
            onBack={handleBack}
            isLoading={loadingMsgs}
            className="h-full"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center px-4">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                <FiSearch className="w-10 h-10 text-green-300" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Select a conversation</h2>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                Choose a conversation from the list to start messaging, or search for a specific contact.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
