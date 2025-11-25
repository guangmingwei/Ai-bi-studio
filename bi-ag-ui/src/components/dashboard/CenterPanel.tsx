import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../store';
import { VideoGrid } from './VideoGrid';
import { CenterMap } from './CenterMap';
import { TechPanel } from '../ui/TechPanel';
import { Sparkles, Send, Bot, User } from 'lucide-react';

export const CenterPanel: React.FC = () => {
  const { centerMode } = useAppStore();

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence mode="wait">
        {centerMode === 'video-grid' && (
          <motion.div 
            key="video"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="h-full w-full"
          >
            <VideoGrid />
          </motion.div>
        )}

        {centerMode === 'map' && (
          <motion.div 
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full"
          >
            <CenterMap />
          </motion.div>
        )}

        {centerMode === 'ai-chat' && (
          <motion.div 
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full w-full p-4"
          >
             <TechPanel title="AI Copilot 智能助手" className="h-full shadow-2xl border-blue-400/20">
                <div className="flex flex-col h-full relative z-10">
                   {/* 聊天记录区域 */}
                   <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                      {/* AI 欢迎语 */}
                      <div className="flex gap-4">
                         <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
                            <Bot size={20} className="text-white" />
                         </div>
                         <div className="max-w-[80%]">
                            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl rounded-tl-none text-sm text-slate-100 shadow-sm">
                               <p>我是您的智能安防助手。您可以让我帮您：</p>
                               <ul className="list-disc list-inside mt-2 space-y-1 text-slate-300">
                                  <li>调取特定区域监控</li>
                                  <li>分析今日告警数据</li>
                                  <li>生成安全简报</li>
                               </ul>
                            </div>
                         </div>
                      </div>

                      {/* 用户指令模拟 */}
                      <div className="flex gap-4 flex-row-reverse">
                         <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-white/10">
                            <User size={20} className="text-slate-300" />
                         </div>
                         <div className="max-w-[80%]">
                            <div className="bg-blue-600/20 backdrop-blur-md border border-blue-500/30 p-4 rounded-2xl rounded-tr-none text-sm text-white shadow-sm">
                               帮我调取北门监控，并分析人流量。
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* 输入框区域 */}
                   <div className="mt-4 relative">
                      <input 
                        type="text" 
                        placeholder="输入指令或按住说话..." 
                        className="w-full bg-slate-900/50 border border-white/10 rounded-full pl-6 pr-12 py-4 text-white focus:outline-none focus:border-blue-400/50 focus:bg-slate-900/80 transition-all backdrop-blur-md"
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 hover:bg-blue-400 rounded-full text-white transition-colors shadow-lg shadow-blue-500/20">
                         <Send size={18} />
                      </button>
                   </div>
                </div>
                
                {/* 背景装饰 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>
             </TechPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
