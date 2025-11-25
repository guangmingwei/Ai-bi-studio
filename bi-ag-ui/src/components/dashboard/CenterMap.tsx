import React, { useState } from 'react';
import { TechPanel } from '../ui/TechPanel';
import { X, Maximize2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cameraPoints = [
  { id: 1, x: '30%', y: '40%', label: 'Zone A: 北门' },
  { id: 2, x: '50%', y: '50%', label: 'Zone B: 广场' },
  { id: 3, x: '70%', y: '30%', label: 'Zone C: 仓库' },
];

interface CenterMapProps {
  activeVideo?: string | null;
  onCloseVideo?: () => void;
}

export const CenterMap: React.FC<CenterMapProps> = ({ activeVideo, onCloseVideo }) => {
  const [internalVideo, setInternalVideo] = useState<string | null>(null);
  const currentVideo = activeVideo || internalVideo;
  const handleClose = onCloseVideo || (() => setInternalVideo(null));

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl">
      {/* 3D 旋转地球背景 (轻科技版) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-60 pointer-events-none">
         {/* 外环 */}
         <div className="w-full h-full border border-slate-500/20 rounded-full animate-[spin_30s_linear_infinite]"></div>
         {/* 内环 - 虚线 */}
         <div className="absolute top-[15%] left-[15%] w-[70%] h-[70%] border border-dashed border-blue-400/30 rounded-full animate-[spin_20s_linear_infinite_reverse]"></div>
         {/* 核心光晕 */}
         <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-blue-500/10 blur-3xl rounded-full animate-pulse"></div>
         {/* 网格纹理 */}
         <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,transparent_40%,rgba(255,255,255,0.05)_100%)]"></div>
      </div>

      {/* 悬浮 UI 层 */}
      <div className="absolute inset-0 z-10">
        {cameraPoints.map((point) => (
          <div 
            key={point.id}
            className="absolute cursor-pointer group z-20"
            style={{ left: point.x, top: point.y }}
            onClick={() => setInternalVideo(`CAM-${point.id}`)}
          >
            <div className="relative flex items-center justify-center w-8 h-8">
               {/* 扩散波纹 */}
               <div className="absolute inset-0 bg-blue-400/30 rounded-full animate-ping"></div>
               <div className="relative z-10 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(56,189,248,1)] transition-transform group-hover:scale-125"></div>
               
               {/* 垂直引线 */}
               <div className="absolute bottom-full left-1/2 w-[1px] h-8 bg-gradient-to-t from-blue-400/50 to-transparent"></div>
            </div>
            
            {/* 悬浮玻璃标签 */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-lg text-xs text-slate-200 whitespace-nowrap opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
              {point.label}
            </div>
          </div>
        ))}
      </div>

      {/* 视频弹窗 (使用新风格 TechPanel) */}
      <AnimatePresence>
        {currentVideo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-8"
          >
            <TechPanel 
               className="w-full max-w-3xl h-[480px] shadow-2xl" 
               title={`正在连接: ${currentVideo}`}
               rightContent={
                 <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                   <X size={18} className="text-white/70" />
                 </button>
               }
            >
               <div className="flex-1 bg-black/40 relative overflow-hidden rounded-lg border border-white/5 h-full">
                  <div className="absolute inset-0 flex items-center justify-center text-blue-400/30">
                     <Maximize2 size={48} />
                  </div>
                  <div className="absolute bottom-4 left-4 font-mono text-blue-300/50 text-xs">
                     SIGNAL: OPTIMAL <br/>
                     LAT: 34.0522 N | LNG: 118.2437 W
                  </div>
               </div>
            </TechPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
