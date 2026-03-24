import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  MessageSquare, 
  Plus, 
  Trash2, 
  ChevronRight,
  Sparkles,
  History,
  Loader2
} from 'lucide-react';
import { useAISession } from '../../hooks/useAISession';
import { aiService } from '../../services/aiService';
import type { AIAction } from '../../types/ai-architect';
import './styles.css';

interface AIArchitectProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
  selectedMerchant?: any;
  onNavigate?: (page: string) => void;
  onAction?: (action: AIAction) => void;
}

export default function AIArchitect({ 
  isOpen, 
  onClose, 
  currentPage,
  selectedMerchant,
  onNavigate,
  onAction
}: AIArchitectProps) {
  const {
    sessions,
    currentSessionId,
    currentSession,
    setCurrentSessionId,
    createSession,
    deleteSession,
    addMessage,
    isLoading: sessionLoading,
    setIsLoading,
  } = useAISession();

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update AI context when page changes
  useEffect(() => {
    aiService.setContext({ currentPage, selectedMerchant });
  }, [currentPage, selectedMerchant]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId || sessionLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    addMessage(currentSessionId, {
      role: 'user',
      content: userMessage,
    });

    setIsLoading(true);

    try {
      // Process with AI
      const response = await aiService.processMessage(
        userMessage,
        currentSession?.messages || []
      );

      // Add AI response
      addMessage(currentSessionId, {
        role: 'assistant',
        content: response.content,
        metadata: {
          action: response.action?.type,
          suggestions: response.suggestions,
        },
      });

      // Execute action if present
      if (response.action) {
        handleAction(response.action);
      }
    } catch (error) {
      addMessage(currentSessionId, {
        role: 'assistant',
        content: '抱歉，處理你的請求時出現問題。請稍後再試。',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: AIAction) => {
    if (!action) return;

    switch (action.type) {
      case 'navigate':
        onNavigate?.(action.page);
        break;
      case 'alert':
        onAction?.(action);
        break;
      case 'export':
        onAction?.(action);
        break;
      default:
        onAction?.(action);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    // Auto-send after a brief delay
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-HK', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format date for session list - reserved for future use
  // const formatDate = (timestamp: number) => {
  //   const date = new Date(timestamp);
  //   const today = new Date();
  //   const yesterday = new Date(today);
  //   yesterday.setDate(yesterday.getDate() - 1);
  //   if (date.toDateString() === today.toDateString()) {
  //     return '今天';
  //   } else if (date.toDateString() === yesterday.toDateString()) {
  //     return '昨天';
  //   }
  //   return date.toLocaleDateString('zh-HK', { 
  //     month: 'short', 
  //     day: 'numeric' 
  //   });
  // };

  if (!isOpen) {
    return (
      <button
        onClick={() => {}}
        className="ai-architect-fab"
        title="打開 AI 助手"
      >
        <Bot size={24} />
      </button>
    );
  }

  return (
    <div className="ai-architect-overlay" onClick={onClose}>
      <div className="ai-architect-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-architect-header">
          <div className="ai-architect-header-left">
            <div className="ai-architect-avatar">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="ai-architect-title">EasyLink Architect</h3>
              <span className="ai-architect-subtitle">
                {sessionLoading ? '思考中...' : 'AI 智能助手'}
              </span>
            </div>
          </div>
          <div className="ai-architect-header-actions">
            <button 
              className="ai-architect-icon-btn"
              onClick={() => setShowHistory(!showHistory)}
              title="對話歷史"
            >
              <History size={18} />
            </button>
            <button 
              className="ai-architect-icon-btn"
              onClick={onClose}
              title="關閉"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="ai-architect-body">
          {/* History Sidebar */}
          {showHistory && (
            <div className="ai-architect-sidebar">
              <div className="ai-architect-sidebar-header">
                <span className="ai-architect-sidebar-title">對話歷史</span>
                <button 
                  className="ai-architect-new-chat-btn"
                  onClick={() => createSession()}
                >
                  <Plus size={14} />
                  新對話
                </button>
              </div>
              <div className="ai-architect-session-list">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`ai-architect-session-item ${session.id === currentSessionId ? 'active' : ''}`}
                    onClick={() => setCurrentSessionId(session.id)}
                  >
                    <MessageSquare size={14} />
                    <span className="ai-architect-session-title">{session.title}</span>
                    <button
                      className="ai-architect-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="ai-architect-chat">
            {/* Messages */}
            <div className="ai-architect-messages">
              {currentSession?.messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`ai-architect-message ${message.role}`}
                >
                  {message.role === 'assistant' && (
                    <div className="ai-architect-message-avatar">
                      <Sparkles size={14} />
                    </div>
                  )}
                  <div className="ai-architect-message-content">
                    <div className="ai-architect-message-bubble">
                      {message.content.split('\n').map((line, i) => (
                        <p key={i} className={line.startsWith('•') ? 'list-item' : ''}>
                          {line}
                        </p>
                      ))}
                    </div>
                    
                    {/* Suggestions */}
                    {message.metadata?.suggestions && index === currentSession.messages.length - 1 && (
                      <div className="ai-architect-suggestions">
                        {message.metadata.suggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            className="ai-architect-suggestion-chip"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                            <ChevronRight size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <span className="ai-architect-message-time">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              
              {sessionLoading && (
                <div className="ai-architect-message assistant">
                  <div className="ai-architect-message-avatar">
                    <Sparkles size={14} />
                  </div>
                  <div className="ai-architect-message-content">
                    <div className="ai-architect-typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="ai-architect-input-area">
              <div className="ai-architect-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="輸入訊息... (例如: 查看今日交易)"
                  className="ai-architect-input"
                  disabled={sessionLoading}
                />
                <button
                  className="ai-architect-send-btn"
                  onClick={handleSend}
                  disabled={!input.trim() || sessionLoading}
                >
                  {sessionLoading ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
              <div className="ai-architect-input-hint">
                按 Enter 發送 • 輸入「幫助」查看功能
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
