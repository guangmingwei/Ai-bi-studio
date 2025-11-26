import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../store';
import { VideoGrid } from './VideoGrid';
import { CenterMap } from './CenterMap';
import { TechPanel } from '../ui/TechPanel';
import { ChatPanel } from '../../ai/components/ChatPanel';

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
                <ChatPanel />
                
                {/* 背景装饰 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>
             </TechPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
