import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  FiSearch, FiPlus, FiArrowLeft, FiWifi, FiWifiOff,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useWebSocket from '../hooks/useWebSocket';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { chatService } from '../services/chat';
import {
  ensureArray, listFromApi, mapChatConversationRow, mapChatConversationDetail, mapApiMessageToUi,
} from '../utils/helpers';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(!!conversationId);
  const typingTimeoutRef = useRef(null);

  const wsPath = activeConversation?.id ? `/ws/chat/${activeConversation.id}/` : null;
  const { isConnected, sendMessage: wsSend } = useWebSocket(wsPath || '/ws/chat/0/', {
    autoConnect: !!wsPath,
    onMessage: useCallback((data) => {
      if (data?.type === 'message' && data.message) {
        const msg = mapApiMessageToUi(data.message);
        if (!msg) return;
        if (activeConversation) {
          setMessages((prev) => [...prev, msg]);
          chatService.markAsRead(activeConversation.id).catch(() => {});
        }
        setConversations((prev) => {
          const next = prev
            .map((c) =>
              c.id === activeConversation?.id
                ? { ...c, lastMessage: msg.text || 'Image', lastMessageAt: msg.createdAt, unread: 0 }
                : c
            )
            .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
          return next;
        });
        return;
      }
      if (data?.type === 'typing') {
        const typerId = data.user_id ?? data.userId;
        if (typerId && typerId !== user?.id) {
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
      const raw = listFromApi(data);
      const convs = raw.map((c) => mapChatConversationRow(c)).filter(Boolean);
      setConversations(convs);

      if (conversationId) {
        const found = convs.find((c) => String(c.id) === String(conversationId));
        if (found) {
          setActiveConversation(found);
          setMobileShowChat(true);
        } else {
          try {
            const detail = await chatService.getConversationById(conversationId);
            const ui = mapChatConversationDetail(detail, user?.id);
            if (ui) {
              setConversations((prev) => {
                if (prev.some((p) => String(p.id) === String(ui.id))) return prev;
                return [ui, ...prev];
              });
              setActiveConversation(ui);
              setMobileShowChat(true);
            }
          } catch {
            toast.error('Could not open this conversation');
            navigate('/chat', { replace: true });
          }
        }
      }
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConvs(false);
    }
  }, [conversationId, user?.id, navigate]);

  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMsgs(true);
    try {
      const data = await chatService.getMessages(convId, { limit: 50 });
      const raw = Array.isArray(data?.messages) ? data.messages : listFromApi(data);
      const msgs = raw.map((m) => mapApiMessageToUi(m)).filter(Boolean);
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
      const result = await chatService.sendMessage(activeConversation.id, { content: text });
      const rawMsg = result.message || result;
      const created =
        mapApiMessageToUi(rawMsg)
        || {
          id: rawMsg?.id || optimisticMsg.id,
          senderId: user?.id,
          text,
          createdAt: rawMsg?.created_at || optimisticMsg.createdAt,
          type: 'text',
        };
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? created : m)),
      );
      wsSend({ type: 'message', content: text });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      toast.error('Failed to send message');
    }
  };

  const handleSendImage = async (file) => {
    if (!activeConversation?.id) return;
    try {
      const result = await chatService.sendImageMessage(activeConversation.id, file);
      const msg = mapApiMessageToUi(result.message || result);
      if (msg) setMessages((prev) => [...prev, msg]);
    } catch {
      toast.error('Failed to send image');
    }
  };

  const handleBack = () => {
    setMobileShowChat(false);
    setActiveConversation(null);
    navigate('/chat', { replace: true });
  };

  const safeConversations = ensureArray(conversations);
  const filteredConversations = searchQuery
    ? safeConversations.filter((c) =>
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.propertyTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : safeConversations;

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
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-green-200"
              aria-label={t('nav.home')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-green-700 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-xl font-bold text-green-800">{t('app.name')}</span>
            </Link>
            <div className="flex items-center gap-2 flex-shrink-0">
              <h1 className="sr-only">Messages</h1>
              {isConnected ? (
                <FiWifi className="w-4 h-4 text-green-500" title="Connected" />
              ) : (
                <FiWifiOff className="w-4 h-4 text-red-400" title="Disconnected" />
              )}
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" aria-label="New">
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
