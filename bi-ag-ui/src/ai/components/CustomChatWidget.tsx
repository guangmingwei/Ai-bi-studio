import React, { useState } from 'react';
import { useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { Send, X, User, Bot, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CustomChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // 使用 CopilotKit 的核心 Chat Hook
  const { visibleMessages, appendMessage, isLoading } = useCopilotChat({
    labels: {
      initial: "我是您的智能驾驶舱助手，接入了 Qwen-VL 视觉大模型。您可以让我控制大屏、分析数据或查看监控。",
    },
  });

  const [inputValue, setInputValue] = useState('');

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const content = inputValue;
    setInputValue('');
    
    // Explicitly construct the message object to avoid potential internal inference issues
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

  // Helper to safely render message content
  const renderMessageContent = (msg: any) => {
    if (typeof msg.content === 'string') return msg.content;
    // Handle case where content might be an array or object (though typically string for TextMessage)
    return JSON.stringify(msg.content);
  };

  return (
    <>
      {/* 悬浮按钮 */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-tech-cyan to-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.4)] z-50 border border-tech-cyan/50"
        >
          <Sparkles className="text-white w-8 h-8 animate-pulse" />
        </motion.button>
      )}

      {/* 自定义对话窗口 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-28 right-8 w-[400px] h-[600px] bg-slate-900/95 backdrop-blur-xl border border-tech-cyan/30 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-bold text-tech-cyan tracking-wider">QWEN-VL AGENT</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-tech-cyan/20 scrollbar-track-transparent">
              {visibleMessages.map((msg, idx) => {
                 // Safely determine role
                 const isUser = msg.role === Role.User || msg.role === 'user';
                 
                 return (
                  <div 
                    key={idx} 
                    className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center shrink-0 border
                      ${isUser 
                        ? 'bg-blue-500/20 border-blue-400 text-blue-300' 
                        : 'bg-tech-cyan/20 border-tech-cyan text-tech-cyan'
                      }
                    `}>
                      {isUser ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    
                    <div className={`
                      max-w-[80%] p-3 rounded-xl text-sm leading-relaxed border
                      ${isUser
                        ? 'bg-blue-600/20 border-blue-500/30 text-blue-50 rounded-tr-none'
                        : 'bg-slate-800/50 border-white/10 text-slate-200 rounded-tl-none'
                      }
                    `}>
                      {renderMessageContent(msg)}
                    </div>
                  </div>
                );
              })}
              
              {isLoading && (
                <div className="flex gap-3">
                   <div className="w-8 h-8 rounded-full bg-tech-cyan/20 border border-tech-cyan flex items-center justify-center shrink-0">
                     <Bot size={14} className="text-tech-cyan" />
                   </div>
                   <div className="bg-slate-800/50 border border-white/10 p-3 rounded-xl rounded-tl-none flex gap-1 items-center">
                     <div className="w-2 h-2 bg-tech-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                     <div className="w-2 h-2 bg-tech-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                     <div className="w-2 h-2 bg-tech-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入指令 (如: 切换到监控中心)..."
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-tech-cyan/50 focus:ring-1 focus:ring-tech-cyan/50 transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-tech-cyan/20 hover:bg-tech-cyan/40 text-tech-cyan rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
