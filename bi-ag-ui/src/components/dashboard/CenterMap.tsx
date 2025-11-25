import React, { useState } from 'react';
import { TechPanel } from '../ui/TechPanel';
import { MapPin, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 模拟地图上的摄像头点位
const cameraPoints = [
  { id: 1, x: '20%', y: '30%', label: '北门' },
  { id: 2, x: '50%', y: '50%', label: '中心广场' },
  { id: 3, x: '75%', y: '25%', label: '2号仓库' },
  { id: 4, x: '60%', y: '80%', label: '地下车库入口' },
];

interface CenterMapProps {
  activeVideo?: string | null; // 外部传入的激活视频ID，用于AI控制
  onCloseVideo?: () => void;
}

export const CenterMap: React.FC<CenterMapProps> = ({ activeVideo, onCloseVideo }) => {
  // 内部状态仅用于演示，实际应由 Props 控制（AI驱动）
  const [internalVideo, setInternalVideo] = useState<string | null>(null);

  const currentVideo = activeVideo || internalVideo;
  const handleClose = onCloseVideo || (() => setInternalVideo(null));

  return (
    <div className="relative w-full h-full p-0 overflow-hidden rounded-lg border border-tech-panel-border bg-tech-bg/80">
      {/* 1. 抽象地图背景 */}
      <div className="absolute inset-0 bg-tech-grid opacity-30 pointer-events-none"></div>
      
      {/* 装饰性圆圈 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-tech-blue/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-tech-cyan/20 rounded-full border-dashed animate-[spin_15s_linear_infinite_reverse]"></div>

      {/* 2. 摄像头点位 */}
      {cameraPoints.map((point) => (
        <div 
          key={point.id}
          className="absolute cursor-pointer group"
          style={{ left: point.x, top: point.y }}
          onClick={() => setInternalVideo(`camera-${point.id}`)}
        >
          <div className="relative flex items-center justify-center w-8 h-8">
             <div className="absolute inset-0 bg-tech-cyan/30 rounded-full animate-ping"></div>
             <div className="relative z-10 p-1.5 bg-tech-bg border border-tech-cyan rounded-full text-tech-cyan hover:bg-tech-cyan hover:text-tech-bg transition-colors">
               <MapPin size={16} />
             </div>
          </div>
          {/* Label */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-tech-bg/90 border border-tech-panel-border text-xs text-tech-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {point.label}
          </div>
        </div>
      ))}

      {/* 3. 视频弹窗 (模拟AI调用后的效果) */}
      <AnimatePresence>
        {currentVideo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <TechPanel className="w-full max-w-2xl h-[400px] bg-tech-bg relative flex flex-col p-0" title="实时监控画面">
               <button 
                 onClick={handleClose}
                 className="absolute top-2 right-2 z-30 p-1 text-tech-text hover:text-tech-alert transition-colors"
               >
                 <X size={24} />
               </button>

               <div className="flex-1 relative bg-black w-full h-full overflow-hidden group">
                  {/* 模拟视频画面内容 */}
                  <div className="absolute inset-0 flex items-center justify-center text-tech-text-dim">
                    <div className="text-center">
                       <Maximize2 size={48} className="mx-auto mb-2 opacity-50" />
                       <p>正在连接视频流: {currentVideo}...</p>
                       <p className="text-xs mt-2 text-tech-cyan animate-pulse">LIVE STREAMING</p>
                    </div>
                  </div>
                  
                  {/* 模拟视频扫光效果 */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-tech-cyan/20 blur-sm animate-[scan_2s_linear_infinite]"></div>
               </div>
            </TechPanel>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 底部提示 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-tech-panel border border-tech-panel-border rounded-full text-xs text-tech-cyan/70">
        点击地图点位 或 使用 Cmd+K 唤起 AI 助手查看监控
      </div>
    </div>
  );
};
