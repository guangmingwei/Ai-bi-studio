import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { Send, X, User, Bot, Sparkles, Mic, MicOff, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { speechToText, connectAudioStream } from '../services/voiceService';
import { useAppStore } from '../../store';

export const CustomChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 使用 CopilotKit 的核心 Chat Hook
  const { visibleMessages, appendMessage, isLoading } = useCopilotChat();
  
  // 从全局store获取状态（Actions已在App.tsx中注册）
  const { chartConfigs, isChartModalOpen } = useAppStore();
  useEffect(() => {
    console.log('[CustomChatWidget] Chart state changed from store:', {
      chartConfigs,
      isChartModalOpen,
      chartCount: chartConfigs.length
    });
  }, [chartConfigs, isChartModalOpen]);

  const [inputValue, setInputValue] = useState('');

  // 语音功能状态
  const { isRecording, startRecording, stopRecording, cancelRecording, error: recorderError } = useVoiceRecorder();
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const audioQueueRef = useRef<Blob[]>([]); // 音频队列
  const isPlayingRef = useRef<boolean>(false); // 是否正在播放
  const audioStreamCleanupRef = useRef<(() => void) | null>(null); // SSE连接清理函数
  const connectedSessionIdRef = useRef<string | null>(null); // 当前已连接的sessionId

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const content = inputValue;
    setInputValue('');
    
    await appendMessage(new TextMessage({
      role: Role.User,
      content: content,
    }));
  };

  // 处理语音输入
  const handleVoiceInput = async () => {
    if (isRecording) {
      setIsProcessingVoice(true);
      setVoiceError(null);

      try {
        const audioBlob = await stopRecording();
        if (!audioBlob) {
          throw new Error('录音失败');
        }

        const result = await speechToText(audioBlob);
        
        if (result.text) {
          // 语音识别成功后自动发送，不再需要用户手动点击发送按钮
          console.log('[CustomChatWidget] Voice recognized, auto-sending:', result.text);
          await appendMessage(new TextMessage({
            role: Role.User,
            content: result.text,
          }));
        } else {
          setVoiceError('未识别到语音内容');
        }
      } catch (error: unknown) {
        const err = error as Error;
        setVoiceError(err.message || '语音识别失败');
        cancelRecording();
      } finally {
        setIsProcessingVoice(false);
      }
    } else {
      setVoiceError(null);
      await startRecording();
    }
  };

  // 播放音频队列中的下一个
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const audioBlob = audioQueueRef.current.shift();
    if (!audioBlob) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    try {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('音频播放失败'));
        };
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('[CustomChatWidget] Audio playback error:', error);
    }

    isPlayingRef.current = false;

    // 继续播放队列中的下一个
    if (audioQueueRef.current.length > 0) {
      setTimeout(() => playNextAudio(), 50);
    } else {
      setIsSpeaking(false);
    }
  }, []);
  
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
  const processMessageContent = React.useCallback((content: string): string => {
    const processed = content
      .replace(/<!--AUDIO_SESSION:.*?-->/g, '') // 移除音频session标记
      .replace(/<details[\s\S]*?<\/details>/gi, '')
      .replace(/&lt;details&gt;[\s\S]*?&lt;\/details&gt;/gi, '')
      .replace(/\n<details>\s*<summary>.*?<\/summary>[\s\S]*?<\/details>\s*/gi, '')
      .replace(/<details>\s*<summary>.*?<\/summary>[\s\S]*?<\/details>/gi, '');
    
    if (!processed.trim()) {
      return '';
    }
    
    return processed.trim();
  }, []);

  // Filter and deduplicate messages
  const displayMessages = React.useMemo(() => {
    const seen = new Set<string>();
    const filtered: unknown[] = [];
    
    for (const msg of visibleMessages) {
      const msgAny = msg as unknown as Record<string, unknown>;
      
      const content = msgAny.content 
        ? (typeof msgAny.content === 'string' ? msgAny.content : JSON.stringify(msgAny.content))
        : '';
      
      const isUser = msgAny.role === Role.User || msgAny.role === 'user';
      
      const key = `${msgAny.role as string}-${content.substring(0, Math.min(50, content.length))}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        
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
  }, [visibleMessages, processMessageContent]);

  // 监听AI回复并建立音频SSE连接
  useEffect(() => {
    if (!autoPlayVoice || displayMessages.length === 0 || !isOpen) return;

    const lastMessage = displayMessages[displayMessages.length - 1] as unknown as Record<string, unknown>;
    const isAssistant = lastMessage.role !== Role.User && lastMessage.role !== 'user';

    if (!isAssistant) return;

    const content = lastMessage.content 
      ? (typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content))
      : '';

    // 检测sessionId（后端会在第一个chunk中发送HTML注释）
    const sessionIdMatch = /<!--AUDIO_SESSION:(session_[^-]+)-->/.exec(content);
    
    if (sessionIdMatch) {
      const sessionId = sessionIdMatch[1];
      
      // 检查是否已经连接过这个session
      if (connectedSessionIdRef.current === sessionId) {
        console.log(`[CustomChatWidget] Session ${sessionId} already connected, skipping`);
        return;
      }
      
      console.log('[CustomChatWidget] Detected NEW audio session:', sessionId);
      
      // 清理旧连接
      if (audioStreamCleanupRef.current) {
        console.log('[CustomChatWidget] Cleaning up previous SSE connection');
        audioStreamCleanupRef.current();
        audioStreamCleanupRef.current = null;
      }
      
      // 清空音频队列
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      
      // 标记当前连接的sessionId
      connectedSessionIdRef.current = sessionId;
      
      // 建立SSE连接
      const cleanup = connectAudioStream(
        sessionId,
        (audioBlob, _text, index) => {
          // 收到音频，加入队列
          console.log(`[CustomChatWidget] Received audio chunk ${index}, adding to queue (current queue size: ${audioQueueRef.current.length})`);
          audioQueueRef.current.push(audioBlob);
          
          // 如果没在播放，立即开始
          if (!isPlayingRef.current) {
            playNextAudio();
          }
        },
        () => {
          // 完成
          console.log('[CustomChatWidget] Audio stream complete');
        },
        (error) => {
          console.error('[CustomChatWidget] Audio stream error:', error);
          setVoiceError(error.message);
        }
      );
      
      audioStreamCleanupRef.current = cleanup;
    }

  }, [displayMessages, autoPlayVoice, isOpen, playNextAudio]);

  // 清理SSE连接
  useEffect(() => {
    return () => {
      if (audioStreamCleanupRef.current) {
        console.log('[CustomChatWidget] Component unmounting, cleaning up SSE');
        audioStreamCleanupRef.current();
        connectedSessionIdRef.current = null;
      }
    };
  }, []);

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
                <span className="font-bold text-tech-cyan tracking-wider">智能安防助手</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-tech-cyan/20 scrollbar-track-transparent">
              {displayMessages.map((msg, idx) => {
                 const msgAny = msg as unknown as Record<string, unknown>;
                 const isUser = msgAny.role === Role.User || msgAny.role === 'user';
                 
                 // Safely extract content with fallback
                 const content = msgAny.content 
                   ? (typeof msgAny.content === 'string' ? msgAny.content : JSON.stringify(msgAny.content))
                   : '';
                 
                 const displayContent = isUser ? content : processMessageContent(content);
                 
                 // Generate stable key
                 const messageKey = `${(msgAny.id as string) || idx}-${msgAny.role as string}`;
                 
                 return (
                  <motion.div 
                    key={messageKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
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
                      {isUser ? (
                        displayContent
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              // 自定义样式以适配科技风格
                              p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />,
                              ul: ({...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                              ol: ({...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                              li: ({...props}) => <li className="text-slate-200" {...props} />,
                              strong: ({...props}) => <strong className="font-semibold text-tech-cyan" {...props} />,
                              em: ({...props}) => <em className="italic text-slate-300" {...props} />,
                              // @ts-expect-error - ReactMarkdown component type
                              code: ({inline, ...props}) => 
                                inline ? (
                                  <code className="px-1.5 py-0.5 bg-slate-700/50 rounded text-xs text-tech-cyan font-mono" {...props} />
                                ) : (
                                  <code className="block p-2 bg-slate-900/50 rounded text-xs text-slate-300 font-mono overflow-x-auto" {...props} />
                                ),
                              a: ({...props}) => <a className="text-tech-cyan hover:underline" {...props} />,
                              h1: ({...props}) => <h1 className="text-lg font-bold mb-2 text-tech-cyan" {...props} />,
                              h2: ({...props}) => <h2 className="text-base font-bold mb-1.5 text-tech-cyan" {...props} />,
                              h3: ({...props}) => <h3 className="text-sm font-semibold mb-1 text-slate-300" {...props} />,
                            }}
                          >
                            {displayContent}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              
              {/* Loading indicator - only show when loading and no partial content yet */}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                   <div className="w-8 h-8 rounded-full bg-tech-cyan/20 border border-tech-cyan flex items-center justify-center shrink-0">
                     <Bot size={14} className="text-tech-cyan" />
                   </div>
                   <div className="bg-slate-800/50 border border-white/10 px-4 py-3 rounded-xl rounded-tl-none flex items-center gap-2 text-slate-400 text-sm">
                     <span>正在思考</span>
                     <div className="flex gap-1">
                       <div className="w-1.5 h-1.5 bg-tech-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                       <div className="w-1.5 h-1.5 bg-tech-cyan rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
                       <div className="w-1.5 h-1.5 bg-tech-cyan rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
                     </div>
                   </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-white/5 space-y-2">
              {/* 错误提示 */}
              {(voiceError || recorderError) && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs">
                  {voiceError || recorderError}
                </div>
              )}

              {/* 语音控制栏 */}
              <div className="flex items-center justify-between px-1">
                <button
                  onClick={() => setAutoPlayVoice(!autoPlayVoice)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                    autoPlayVoice 
                      ? 'bg-tech-cyan/20 text-tech-cyan border border-tech-cyan/30' 
                      : 'bg-slate-800/50 text-slate-400 border border-white/10'
                  }`}
                >
                  <Volume2 size={12} />
                  <span>{autoPlayVoice ? '语音:开' : '语音:关'}</span>
                </button>

                {isSpeaking && (
                  <div className="flex items-center gap-1 text-tech-cyan text-xs">
                    <div className="w-1 h-1 bg-tech-cyan rounded-full animate-pulse" />
                    <span>播放中...</span>
                  </div>
                )}

                {isRecording && (
                  <div className="flex items-center gap-1 text-red-400 text-xs animate-pulse">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    <span>录音中</span>
                  </div>
                )}
              </div>

              {/* 输入框 */}
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRecording ? "录音中..." : "输入指令或点击麦克风说话..."}
                  disabled={isLoading || isProcessingVoice || isRecording}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-4 pr-24 text-white placeholder-slate-500 focus:outline-none focus:border-tech-cyan/50 focus:ring-1 focus:ring-tech-cyan/50 transition-all disabled:opacity-50"
                />
                
                {/* 语音按钮 */}
                <button 
                  onClick={handleVoiceInput}
                  disabled={isLoading || isProcessingVoice}
                  className={`absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRecording 
                      ? 'bg-red-500/20 text-red-400 animate-pulse' 
                      : 'bg-tech-cyan/20 hover:bg-tech-cyan/40 text-tech-cyan'
                  }`}
                >
                  {isProcessingVoice ? (
                    <div className="w-4 h-4 border-2 border-tech-cyan border-t-transparent rounded-full animate-spin" />
                  ) : isRecording ? (
                    <MicOff size={16} />
                  ) : (
                    <Mic size={16} />
                  )}
                </button>

                {/* 发送按钮 */}
                <button 
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading || isRecording}
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
