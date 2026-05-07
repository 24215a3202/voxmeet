// ============================================
// Match: Text Chat Panel
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { sanitizeText } from '@/lib/sanitize';
import { CHAT_MAX_LENGTH } from '@/lib/constants';

interface Message {
  id: string;
  text: string;
  timestamp: number;
  isMine: boolean;
}

interface TextChatProps {
  messages: Message[];
  onSend: (text: string) => void;
  disabled?: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export function TextChat({ messages, onSend, disabled, isOpen, onToggle }: TextChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const sanitized = sanitizeText(input.trim());
    if (!sanitized || sanitized.length === 0 || sanitized.length > CHAT_MAX_LENGTH) return;
    onSend(sanitized);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-30 p-4 rounded-2xl bg-vox-primary shadow-lg shadow-vox-primary/30 text-white hover:bg-vox-primary-hover transition-all active:scale-90 md:hidden"
        id="chat-toggle-btn"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-vox-accent rounded-full text-[10px] flex items-center justify-center font-bold">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="glass-strong flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-vox-border/50">
        <h3 className="text-sm font-semibold text-vox-text flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Text Chat
        </h3>
        <button
          onClick={onToggle}
          className="text-vox-text-muted hover:text-vox-text transition-colors md:hidden"
          id="chat-close-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-vox-text-dim text-sm py-8">
            No messages yet. Say hello! 👋
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} animate-slide-up`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm break-words ${
                msg.isMine
                  ? 'bg-vox-primary text-white rounded-br-md'
                  : 'bg-vox-surface text-vox-text border border-vox-border rounded-bl-md'
              }`}
            >
              <p>{msg.text}</p>
              <span className={`text-[10px] mt-1 block ${msg.isMine ? 'text-white/60' : 'text-vox-text-dim'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-vox-border/50">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, CHAT_MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Connect to chat…' : 'Type a message…'}
            disabled={disabled}
            className="input-field text-sm py-2.5"
            id="chat-input"
            maxLength={CHAT_MAX_LENGTH}
          />
          <button
            onClick={handleSend}
            disabled={disabled || input.trim().length === 0}
            className="p-2.5 rounded-xl bg-vox-primary hover:bg-vox-primary-hover text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-90"
            id="chat-send-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22,2 15,22 11,13 2,9" />
            </svg>
          </button>
        </div>
        <div className="text-[10px] text-vox-text-dim mt-1 text-right">
          {input.length}/{CHAT_MAX_LENGTH}
        </div>
      </div>
    </div>
  );
}
