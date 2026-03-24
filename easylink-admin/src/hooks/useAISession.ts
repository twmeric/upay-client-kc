import { useState, useEffect, useCallback } from 'react';
import type { Session, Message } from '../types/ai-architect';

const STORAGE_KEY = 'easylink_architect_sessions';
const MAX_SESSIONS = 20;

export function useAISession() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSessions(parsed);
        if (parsed.length > 0 && !currentSessionId) {
          setCurrentSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to parse sessions:', e);
      }
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const generateId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const createSession = useCallback((title?: string): Session => {
    const newSession: Session = {
      id: generateId(),
      title: title || `對話 ${sessions.length + 1}`,
      messages: [{
        id: 'welcome',
        role: 'assistant',
        content: '你好！我是 EasyLink Architect 👋\n\n我可以幫你：\n• 📊 分析交易趨勢和數據\n• 🏪 查看商戶表現\n• 📱 管理 WhatsApp 報告\n• ⚡ 快速導航到各功能頁面\n• 🔍 查找特定交易或訂單\n\n有什麼可以幫你的嗎？',
        timestamp: Date.now(),
        metadata: {
          suggestions: ['查看今日交易', '分析商戶表現', '設置 WhatsApp 報告', '查找交易']
        }
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSessions(prev => {
      const updated = [newSession, ...prev].slice(0, MAX_SESSIONS);
      return updated;
    });
    setCurrentSessionId(newSession.id);
    return newSession;
  }, [sessions.length]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }, [currentSessionId]);

  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, title: newTitle, updatedAt: Date.now() } : s
    ));
  }, []);

  const addMessage = useCallback((sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      
      // Auto-update title based on first user message
      let title = s.title;
      if (s.messages.length === 1 && message.role === 'user') {
        title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
      }

      return {
        ...s,
        title,
        messages: [...s.messages, newMessage],
        updatedAt: Date.now(),
      };
    }));

    return newMessage;
  }, []);

  const updateContext = useCallback((sessionId: string, context: Session['context']) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, context: { ...s.context, ...context } } : s
    ));
  }, []);

  const getCurrentSession = useCallback((): Session | null => {
    if (!currentSessionId) return null;
    return sessions.find(s => s.id === currentSessionId) || null;
  }, [sessions, currentSessionId]);

  const clearAllSessions = useCallback(() => {
    setSessions([]);
    setCurrentSessionId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Initialize first session if none exists
  useEffect(() => {
    if (sessions.length === 0 && !isLoading) {
      createSession('開始新的對話');
    }
  }, [sessions.length, isLoading, createSession]);

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    currentSession: getCurrentSession(),
    isLoading,
    setIsLoading,
    createSession,
    deleteSession,
    renameSession,
    addMessage,
    updateContext,
    clearAllSessions,
  };
}
