import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { Send, User, Bot, Mic, MicOff, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { speechToText, connectAudioStream } from '../services/voiceService';
import { useAppStore } from '../../store';

/**
 * ChatPanel - 嵌入式AI聊天面板组件
 * 用于在Dashboard的AI Copilot模式中显示
 */
export const ChatPanel: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 使用 CopilotKit 的核心 Chat Hook
  const { visibleMessages, appendMessage, isLoading } = useCopilotChat();
  
  // 从全局store获取图表状态（Actions已在App.tsx中注册）
  const { chartConfigs, isChartModalOpen } = useAppStore();

  // Debug: 监控图表状态变化
  useEffect(() => {
    console.log('[ChatPanel] Chart state changed from store:', {
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
  const [autoPlayVoice, setAutoPlayVoice] = useState(true); // 自动播放AI回复的语音
  const audioQueueRef = useRef<Blob[]>([]); // 音频队列
  const isPlayingRef = useRef<boolean>(false); // 是否正在播放
  const audioStreamCleanupRef = useRef<(() => void) | null>(null); // SSE连接清理函数
  const connectedSessionIdRef = useRef<string | null>(null); // 当前已连接的sessionId

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
      console.error('[ChatPanel] Audio playback error:', error);
    }

    isPlayingRef.current = false;

    // 继续播放队列中的下一个
    if (audioQueueRef.current.length > 0) {
      setTimeout(() => playNextAudio(), 50);
    } else {
      setIsSpeaking(false);
    }
  }, []);

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
      // 停止录音并转换为文本
      setIsProcessingVoice(true);
      setVoiceError(null);

      try {
        const audioBlob = await stopRecording();
        if (!audioBlob) {
          throw new Error('录音失败');
        }

        console.log('[ChatPanel] Transcribing audio...');
        const result = await speechToText(audioBlob);
        
        if (result.text) {
          // 语音识别成功后自动发送，不再需要用户手动点击发送按钮
          console.log('[ChatPanel] Voice recognized, auto-sending:', result.text);
          await appendMessage(new TextMessage({
            role: Role.User,
            content: result.text,
          }));
        } else {
          setVoiceError('未识别到语音内容');
        }
      } catch (error: unknown) {
        const err = error as Error;
        console.error('[ChatPanel] Voice input error:', err);
        setVoiceError(err.message || '语音识别失败');
        cancelRecording();
      } finally {
        setIsProcessingVoice(false);
      }
    } else {
      // 开始录音
      setVoiceError(null);
      await startRecording();
    }
  };

  // 先定义 processMessageContent 函数
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
  }, [visibleMessages, processMessageContent]);

  // 监听AI回复并建立音频SSE连接
  useEffect(() => {
    if (!autoPlayVoice || displayMessages.length === 0) return;

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
        console.log(`[ChatPanel] Session ${sessionId} already connected, skipping`);
        return;
      }
      
      console.log('[ChatPanel] Detected NEW audio session:', sessionId);
      
      // 清理旧连接
      if (audioStreamCleanupRef.current) {
        console.log('[ChatPanel] Cleaning up previous SSE connection');
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
          console.log(`[ChatPanel] Received audio chunk ${index}, adding to queue (current queue size: ${audioQueueRef.current.length})`);
          audioQueueRef.current.push(audioBlob);
          
          // 如果没在播放，立即开始
          if (!isPlayingRef.current) {
            playNextAudio();
          }
        },
        () => {
          // 完成
          console.log('[ChatPanel] Audio stream complete');
        },
        (error) => {
          console.error('[ChatPanel] Audio stream error:', error);
          setVoiceError(error.message);
        }
      );
      
      audioStreamCleanupRef.current = cleanup;
    }

  }, [displayMessages, autoPlayVoice, playNextAudio]);

  // 清理SSE连接
  useEffect(() => {
    return () => {
      if (audioStreamCleanupRef.current) {
        console.log('[ChatPanel] Component unmounting, cleaning up SSE');
        audioStreamCleanupRef.current();
        connectedSessionIdRef.current = null;
      }
    };
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
                {isUser ? (
                  displayContent
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        // 自定义样式
                        p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                        ol: ({...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                        li: ({...props}) => <li className="text-slate-100" {...props} />,
                        strong: ({...props}) => <strong className="font-semibold text-blue-300" {...props} />,
                        em: ({...props}) => <em className="italic text-slate-200" {...props} />,
                        // @ts-expect-error - ReactMarkdown component type
                        code: ({inline, ...props}) => 
                          inline ? (
                            <code className="px-1.5 py-0.5 bg-slate-700/50 rounded text-xs text-blue-300 font-mono" {...props} />
                          ) : (
                            <code className="block p-2 bg-slate-800/50 rounded text-xs text-slate-200 font-mono overflow-x-auto" {...props} />
                          ),
                        a: ({...props}) => <a className="text-blue-400 hover:underline" {...props} />,
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
      <div className="mt-4 space-y-2">
        {/* 错误提示 */}
        {(voiceError || recorderError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs"
          >
            {voiceError || recorderError}
          </motion.div>
        )}

        {/* 语音功能控制条 */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoPlayVoice(!autoPlayVoice)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                autoPlayVoice 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : 'bg-slate-800/50 text-slate-400 border border-white/10 hover:border-white/20'
              }`}
              title={autoPlayVoice ? '关闭语音播放' : '开启语音播放'}
            >
              <Volume2 size={14} />
              <span>{autoPlayVoice ? '语音播放:开' : '语音播放:关'}</span>
            </button>

            {isSpeaking && (
              <div className="flex items-center gap-1 text-blue-400 text-xs">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
                <span>播放中...</span>
              </div>
            )}
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 text-red-400 text-xs animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
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
            placeholder={isRecording ? "录音中... 点击麦克风停止" : "输入指令或点击麦克风说话..."} 
            disabled={isLoading || isProcessingVoice || isRecording}
            className="w-full bg-slate-900/50 border border-white/10 rounded-full pl-6 pr-24 py-4 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400/50 focus:bg-slate-900/80 transition-all backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          {/* 语音输入按钮 */}
          <button 
            onClick={handleVoiceInput}
            disabled={isLoading || isProcessingVoice}
            className={`absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-full text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-400 shadow-red-500/30 animate-pulse' 
                : 'bg-blue-500/80 hover:bg-blue-500 shadow-blue-500/20'
            }`}
            title={isRecording ? "停止录音" : "开始录音"}
          >
            {isProcessingVoice ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRecording ? (
              <MicOff size={18} />
            ) : (
              <Mic size={18} />
            )}
          </button>

          {/* 发送按钮 */}
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || isRecording}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 hover:bg-blue-400 rounded-full text-white transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

