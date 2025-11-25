import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, Locate, Navigation, Play, Pause } from 'lucide-react';
import { TechPanel } from '../ui/TechPanel';
import { motion, AnimatePresence } from 'framer-motion';

interface CenterMapProps {
  activeVideo?: string | null; // 外部传入的要显示的视频（如有）
  onCloseVideo?: () => void;
}

const VIDEO_SOURCE = "http://192.168.1.210:18000/m4s/live/stream_3_0.mp4?play_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjI3NjQwNDE3NTcsImlzcyI6InRzaW5nc2VlLWVhc3ljdnIifQ.2onoGTiix77kt44TCuzwtLF6RcXMdDXzrZPQRX5mIu8";

export const CenterMap: React.FC<CenterMapProps> = ({ activeVideo, onCloseVideo }) => {
  const [internalVideo, setInternalVideo] = useState<string | null>(null);
  const currentVideo = activeVideo || internalVideo;
  const handleClose = onCloseVideo || (() => setInternalVideo(null));
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (currentVideo && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(e => console.error("Auto-play failed", e));
      } else {
        videoRef.current.pause();
      }
    }
  }, [currentVideo, isPlaying]);

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
         {/* 模拟地图点位 */}
         {[
            { top: '40%', left: '45%', label: 'CAM-01' },
            { top: '55%', left: '60%', label: 'CAM-03' },
            { top: '35%', left: '65%', label: 'CAM-07' },
         ].map((p, i) => (
            <button 
               key={i}
               onClick={() => setInternalVideo(p.label)}
               className="absolute group"
               style={{ top: p.top, left: p.left }}
            >
               <div className="relative flex items-center justify-center w-4 h-4">
                  <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa]"></div>
               </div>
               {/* Tooltip */}
               <div className="absolute left-1/2 -translate-x-1/2 -top-8 px-2 py-1 bg-black/60 backdrop-blur border border-blue-500/30 rounded text-[10px] text-blue-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {p.label}
               </div>
            </button>
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
               title={`实时监控: ${currentVideo}`}
               rightContent={
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setIsPlaying(!isPlaying)}
                     className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                     title={isPlaying ? "暂停" : "播放"}
                   >
                     {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                   </button>
                   <button onClick={handleClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
                     <X size={18} />
                   </button>
                 </div>
               }
            >
               <div className="flex-1 bg-black relative overflow-hidden rounded-lg border border-white/5 h-full group">
                  <video 
                    ref={videoRef}
                    src={VIDEO_SOURCE}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                  
                  {/* 视频覆盖层信息 */}
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs text-green-400 flex items-center gap-2 border border-white/10">
                     <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                     LIVE SIGNAL
                  </div>

                  <div className="absolute bottom-4 left-4 font-mono text-blue-300/50 text-xs">
                     SIGNAL: OPTIMAL <br/>
                     LAT: 34.0522 N | LNG: 118.2437 W
                  </div>
                  
                  {/* 悬浮操作按钮 */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                     <button className="p-2 bg-black/50 backdrop-blur rounded-lg hover:bg-blue-600/80 text-white transition-colors">
                        <Maximize2 size={16} />
                     </button>
                  </div>
               </div>
            </TechPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
