import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { Send, X, User, Bot, Sparkles, Mic, MicOff, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { speechToText, textToSpeechStream, cleanTextForTTS } from '../services/voiceService';

export const CustomChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 使用 CopilotKit 的核心 Chat Hook
  const { visibleMessages, appendMessage, isLoading } = useCopilotChat();

  const [inputValue, setInputValue] = useState('');

  // 语音功能状态
  const { isRecording, startRecording, stopRecording, cancelRecording, error: recorderError } = useVoiceRecorder();
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const ttsQueueRef = useRef<string[]>([]); // TTS队列
  const isPlayingTTSRef = useRef<boolean>(false); // 是否正在播放TTS
  const currentMessageBufferRef = useRef<string>(''); // 当前消息的缓冲区
  const lastSentLengthRef = useRef<number>(0); // 上次发送TTS的长度
  const lastMessageIdRef = useRef<string>(''); // 用于检测新消息
  const audioPreloadRef = useRef<HTMLAudioElement | null>(null); // 预加载的下一个音频

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
          setInputValue(result.text);
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

  // 播放TTS队列中的下一个片段（带预加载优化）
  const playNextTTSChunk = useCallback(async () => {
    if (isPlayingTTSRef.current || ttsQueueRef.current.length === 0) {
      return;
    }

    isPlayingTTSRef.current = true;
    setIsSpeaking(true);

    const chunk = ttsQueueRef.current.shift();
    if (!chunk) {
      isPlayingTTSRef.current = false;
      setIsSpeaking(false);
      return;
    }

    try {
      console.log(`[CustomChatWidget] Playing TTS chunk: "${chunk.substring(0, 30)}..." (${chunk.length} chars)`);
      
      // 如果有预加载的音频，直接使用
      if (audioPreloadRef.current) {
        const preloadedAudio = audioPreloadRef.current;
        audioPreloadRef.current = null;
        
        await new Promise<void>((resolve, reject) => {
          preloadedAudio.onended = () => resolve();
          preloadedAudio.onerror = () => reject(new Error('音频播放失败'));
          preloadedAudio.play().catch(reject);
        });
      } else {
        // 没有预加载，正常请求
        await textToSpeechStream(chunk);
      }
      
      // 如果队列中还有下一个，提前开始加载（预加载）
      if (ttsQueueRef.current.length > 0) {
        const nextChunk = ttsQueueRef.current[0];
        const cleanedNextChunk = cleanTextForTTS(nextChunk);
        console.log(`[CustomChatWidget] Preloading next chunk: "${nextChunk.substring(0, 20)}..."`);
        
        // 异步预加载下一个音频
        fetch(`${window.location.origin}/api/text-to-speech`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanedNextChunk })
        })
        .then(res => res.blob())
        .then(blob => {
          const audio = new Audio(URL.createObjectURL(blob));
          audio.preload = 'auto';
          audioPreloadRef.current = audio;
          console.log('[CustomChatWidget] Next chunk preloaded successfully');
        })
        .catch(err => {
          console.warn('[CustomChatWidget] Preload failed:', err);
        });
      }
      
    } catch (error) {
      console.error('[CustomChatWidget] TTS chunk error:', error);
    }

    isPlayingTTSRef.current = false;

    // 继续播放队列中的下一个
    if (ttsQueueRef.current.length > 0) {
      // 短暂延迟，让预加载有时间完成
      setTimeout(() => playNextTTSChunk(), 50);
    } else {
      setIsSpeaking(false);
    }
  }, []);

  // 将文本片段加入TTS队列
  const enqueueTTSChunk = useCallback((text: string) => {
    if (!text || text.trim().length === 0) return;
    
    console.log(`[CustomChatWidget] Enqueuing TTS chunk: "${text}"`);
    ttsQueueRef.current.push(text);
    
    // 如果当前没有在播放，立即开始
    if (!isPlayingTTSRef.current) {
      playNextTTSChunk();
    }
  }, [playNextTTSChunk]);

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

  // 流式增量TTS - 监听消息内容变化，每积累一定字符就发送TTS
  useEffect(() => {
    if (!autoPlayVoice || displayMessages.length === 0 || !isOpen) return;

    const lastMessage = displayMessages[displayMessages.length - 1] as unknown as Record<string, unknown>;
    const isAssistant = lastMessage.role !== Role.User && lastMessage.role !== 'user';

    if (!isAssistant) {
      // 如果不是AI消息，重置状态
      currentMessageBufferRef.current = '';
      lastSentLengthRef.current = 0;
      lastMessageIdRef.current = '';
      return;
    }

    const messageId = (lastMessage.id as string) || '';
    const content = lastMessage.content 
      ? (typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content))
      : '';
    
    const processedContent = processMessageContent(content);

    // 检测是否是新消息
    if (messageId && messageId !== lastMessageIdRef.current) {
      console.log('[CustomChatWidget] ===== New AI Message Detected =====');
      console.log(`[CustomChatWidget] Message ID: ${messageId}`);
      console.log('[CustomChatWidget] Resetting TTS buffer');
      currentMessageBufferRef.current = '';
      lastSentLengthRef.current = 0;
      lastMessageIdRef.current = messageId;
      // 清空队列（新消息开始）
      ttsQueueRef.current = [];
      // 清理预加载的音频
      if (audioPreloadRef.current) {
        audioPreloadRef.current.pause();
        audioPreloadRef.current = null;
      }
      if (!isPlayingTTSRef.current) {
        setIsSpeaking(false);
      }
    }

    // 更新缓冲区
    currentMessageBufferRef.current = processedContent;

    // 打印当前接收到的内容状态
    console.log(`[CustomChatWidget] Current content length: ${processedContent.length}, lastSent: ${lastSentLengthRef.current}, isLoading: ${isLoading}`);
    if (processedContent.length > 0) {
      console.log(`[CustomChatWidget] Current full content: "${processedContent}"`);
    }

    // 检查是否有新内容
    const newContentLength = processedContent.length;
    if (newContentLength <= lastSentLengthRef.current) {
      // 没有新内容，直接返回
      return;
    }

    // 提取所有未发送的新内容
    const unsentContent = processedContent.substring(lastSentLengthRef.current);
    const TTS_CHUNK_SIZE = 30; // 最小chunk大小

    // 查找所有可能的断句点
    const punctuationRegex = /[。，！？、；：]/g;
    let match;
    let lastGoodBreakPoint = -1;

    // 找到最后一个超过最小chunk大小的断句点
    while ((match = punctuationRegex.exec(unsentContent)) !== null) {
      if (match.index >= TTS_CHUNK_SIZE * 0.6) {
        lastGoodBreakPoint = match.index;
      }
    }

    let shouldSend = false;
    let chunkToSend = '';

    if (lastGoodBreakPoint >= 0) {
      // 找到了合适的断句点
      chunkToSend = unsentContent.substring(0, lastGoodBreakPoint + 1);
      shouldSend = true;
      console.log(`[CustomChatWidget] Found punctuation at ${lastGoodBreakPoint}, sending ${chunkToSend.length} chars`);
    } else if (unsentContent.length >= TTS_CHUNK_SIZE * 1.5 && !isLoading) {
      // 没找到断句点，但内容很长且消息已完成，强制发送
      chunkToSend = unsentContent;
      shouldSend = true;
      console.log(`[CustomChatWidget] No punctuation found, message complete, sending all ${chunkToSend.length} chars`);
    } else if (unsentContent.length >= TTS_CHUNK_SIZE * 2) {
      // 内容非常长，强制切分避免等待太久
      chunkToSend = unsentContent.substring(0, TTS_CHUNK_SIZE * 1.5);
      shouldSend = true;
      console.log(`[CustomChatWidget] Content too long (${unsentContent.length}), force sending ${chunkToSend.length} chars`);
    }

    if (shouldSend && chunkToSend.trim().length > 0) {
      console.log(`[CustomChatWidget] Enqueuing TTS chunk: "${chunkToSend.substring(0, 30)}..." (${chunkToSend.length} chars)`);
      enqueueTTSChunk(chunkToSend);
      lastSentLengthRef.current += chunkToSend.length;
    }

    // 如果消息加载完成，发送所有剩余内容
    if (!isLoading) {
      const finalRemaining = processedContent.substring(lastSentLengthRef.current);
      if (finalRemaining.trim().length > 0) {
        console.log(`[CustomChatWidget] ===== Message Loading Complete =====`);
        console.log(`[CustomChatWidget] Full message length: ${processedContent.length}`);
        console.log(`[CustomChatWidget] Already sent: ${lastSentLengthRef.current}`);
        console.log(`[CustomChatWidget] Remaining to send: ${finalRemaining.length} chars`);
        console.log(`[CustomChatWidget] Final content: "${finalRemaining}"`);
        enqueueTTSChunk(finalRemaining);
        lastSentLengthRef.current = newContentLength;
        console.log(`[CustomChatWidget] ===================================`);
      } else {
        console.log(`[CustomChatWidget] Message complete, all content already sent (${processedContent.length} chars total)`);
      }
    }

  }, [displayMessages, isLoading, autoPlayVoice, isOpen, processMessageContent, enqueueTTSChunk]);

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
