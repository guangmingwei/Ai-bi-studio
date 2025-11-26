import React, { useState, useRef, useEffect } from 'react';
import { useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { Send, User, Bot } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * ChatPanel - 嵌入式AI聊天面板组件
 * 用于在Dashboard的AI Copilot模式中显示
 */
export const ChatPanel: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 使用 CopilotKit 的核心 Chat Hook
  const { visibleMessages, appendMessage, isLoading } = useCopilotChat();

  const [inputValue, setInputValue] = useState('');

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const content = inputValue;
    setInputValue('');
    
    await appendMessage(new TextMessage({
      role: Role.User,
      content: content,
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, isLoading]);

  // Process message content: hide thinking process and clean up
  const processMessageContent = (content: string): string => {
    // Remove <details> tags and their content (thinking process)
    const processed = content
      .replace(/<details[\s\S]*?<\/details>/gi, '')
      .replace(/&lt;details&gt;[\s\S]*?&lt;\/details&gt;/gi, '')
      .replace(/\n<details>\s*<summary>.*?<\/summary>[\s\S]*?<\/details>\s*/gi, '')
      .replace(/<details>\s*<summary>.*?<\/summary>[\s\S]*?<\/details>/gi, '');
    
    if (!processed.trim()) {
      return '';
    }
    
    return processed.trim();
  };

  // Filter and deduplicate messages
  const displayMessages = React.useMemo(() => {
    const seen = new Set<string>();
    const filtered: unknown[] = [];
    
    for (const msg of visibleMessages) {
      const msgAny = msg as unknown as Record<string, unknown>;
      
      // Safely extract content
      const content = msgAny.content 
        ? (typeof msgAny.content === 'string' ? msgAny.content : JSON.stringify(msgAny.content))
        : '';
      
      const isUser = msgAny.role === Role.User || msgAny.role === 'user';
      
      // Create unique key for deduplication
      const key = `${msgAny.role as string}-${content.substring(0, Math.min(50, content.length))}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        
        // For assistant messages, check if there's actual content
        if (!isUser) {
          const processed = processMessageContent(content);
          if (processed || content.includes('Error') || content.includes('错误')) {
            filtered.push(msg);
          }
        } else {
          filtered.push(msg);
        }
      }
    }
    
    return filtered;
  }, [visibleMessages]);

  return (
    <div className="flex flex-col h-full relative z-10">
      {/* 聊天记录区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* 如果没有消息，显示欢迎语 */}
        {displayMessages.length === 0 && !isLoading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
              <Bot size={20} className="text-white" />
            </div>
            <div className="max-w-[80%]">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl rounded-tl-none text-sm text-slate-100 shadow-sm">
                <p>您好！我是AI综合安防助手。有什么可以帮您的？</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-slate-300 text-xs">
                  <li>切换页面视图 (如: 切换到监控中心)</li>
                  <li>控制仪表板模式 (如: 打开监控墙)</li>
                  <li>触发紧急警报 (如: 启动紧急模式)</li>
                  <li>配置巡逻设置 (如: 开始自动巡逻)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 消息列表 */}
        {displayMessages.map((msg, idx) => {
          const msgAny = msg as unknown as Record<string, unknown>;
          const isUser = msgAny.role === Role.User || msgAny.role === 'user';
          
          const content = msgAny.content 
            ? (typeof msgAny.content === 'string' ? msgAny.content : JSON.stringify(msgAny.content))
            : '';
          
          const displayContent = isUser ? content : processMessageContent(content);
          const messageKey = `${(msgAny.id as string) || idx}-${msgAny.role as string}`;
          
          return (
            <motion.div 
              key={messageKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg
                ${isUser 
                  ? 'bg-slate-700 border border-white/10' 
                  : 'bg-gradient-to-br from-blue-400 to-indigo-600'
                }
              `}>
                {isUser ? (
                  <User size={20} className="text-slate-300" />
                ) : (
                  <Bot size={20} className="text-white" />
                )}
              </div>
              
              <div className={`
                max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-md border
                ${isUser
                  ? 'bg-blue-600/20 border-blue-500/30 text-white rounded-tr-none shadow-sm'
                  : 'bg-white/10 border-white/10 text-slate-100 rounded-tl-none shadow-sm'
                }
              `}>
                {displayContent}
              </div>
            </motion.div>
          );
        })}
        
        {/* Loading indicator */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
              <Bot size={20} className="text-white" />
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-slate-300 text-sm">
              <span>正在思考</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框区域 */}
      <div className="mt-4 relative">
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入指令 (如: 切换到监控中心)..." 
          disabled={isLoading}
          className="w-full bg-slate-900/50 border border-white/10 rounded-full pl-6 pr-12 py-4 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400/50 focus:bg-slate-900/80 transition-all backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button 
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 hover:bg-blue-400 rounded-full text-white transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

