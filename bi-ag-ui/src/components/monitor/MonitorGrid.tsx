import React, { useState } from 'react';
import { Grid2X2, Grid3X3, Maximize2, Settings } from 'lucide-react';

const videos = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  loc: `CAM-0${i + 1}`,
  status: i % 3 === 0 ? 'REC' : 'LIVE'
}));

const VIDEO_SOURCE = "http://192.168.1.210:18000/m4s/live/stream_3_0.mp4?play_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjI3NjQwNDE3NTcsImlzcyI6InRzaW5nc2VlLWVhc3ljdnIifQ.2onoGTiix77kt44TCuzwtLF6RcXMdDXzrZPQRX5mIu8";

export const MonitorGrid: React.FC = () => {
  const [gridSize, setGridSize] = useState<4 | 9>(4);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center p-2 bg-slate-900/40 border border-white/5 rounded-lg">
         <div className="flex gap-2">
            <button 
              onClick={() => setGridSize(4)}
              className={`p-2 rounded transition-all ${gridSize === 4 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}
            >
               <Grid2X2 size={18} />
            </button>
            <button 
              onClick={() => setGridSize(9)}
              className={`p-2 rounded transition-all ${gridSize === 9 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}
            >
               <Grid3X3 size={18} />
            </button>
         </div>
         
         <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>当前显示: {gridSize} 路画面</span>
            <button className="flex items-center gap-1 hover:text-white transition-colors">
               <Settings size={14} /> 设置轮巡
            </button>
         </div>
      </div>

      {/* Video Grid */}
      <div className={`grid gap-2 flex-1 min-h-0 ${gridSize === 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-3'}`}>
         {videos.slice(0, gridSize).map(v => (
            <div key={v.id} className="relative bg-black rounded-lg overflow-hidden border border-white/10 group">
               <div className="absolute inset-0 bg-black">
                  <video 
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                    src={VIDEO_SOURCE}
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                  />
               </div>
               
               {/* 状态栏 */}
               <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10">
                  <span className="bg-black/50 backdrop-blur px-2 py-1 rounded text-xs text-white border border-white/10">{v.loc}</span>
                  {v.status === 'LIVE' ? (
                     <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red]"></div>
                  ) : (
                     <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  )}
               </div>

               {/* 操作层 */}
               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px] z-10">
                  <button className="p-2 rounded-full bg-white/10 border border-white/20 hover:bg-blue-500 hover:border-blue-400 transition-colors text-white">
                     <Maximize2 size={20} />
                  </button>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};
