import React from 'react';
import { Maximize2, MoreHorizontal } from 'lucide-react';

const videos = [
  { id: 1, loc: '北门入口 CAM-01', status: 'LIVE' },
  { id: 2, loc: '2号仓库 CAM-03', status: 'LIVE' },
  { id: 3, loc: '东侧围栏 CAM-07', status: 'REC' },
  { id: 4, loc: '地下车库 CAM-12', status: 'LIVE' },
];

export const VideoGrid: React.FC = () => {
  return (
    <div className="h-full w-full grid grid-cols-2 grid-rows-2 gap-3 p-3">
      {videos.map((v) => (
        <div key={v.id} className="relative rounded-xl overflow-hidden bg-slate-900/80 group shadow-lg border border-white/5">
          {/* 模拟画面底图 - 实际上这里会是 Video 标签 */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
          
          {/* 悬浮顶栏 */}
          <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
             <span className="text-xs font-medium text-white bg-white/10 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                {v.loc}
             </span>
             <button className="text-white/70 hover:text-white">
                <MoreHorizontal size={16} />
             </button>
          </div>

          {/* 状态指示 - 始终显示 */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
             {v.status === 'LIVE' ? (
                <div className="flex items-center gap-1 bg-red-500/20 backdrop-blur-md border border-red-500/30 px-2 py-0.5 rounded text-[10px] text-red-400 font-bold">
                   <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div> LIVE
                </div>
             ) : (
                <div className="flex items-center gap-1 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 px-2 py-0.5 rounded text-[10px] text-amber-400 font-bold">
                   REC
                </div>
             )}
          </div>

          {/* 装饰性角标 */}
          <div className="absolute bottom-3 left-3 opacity-50">
             <div className="w-2 h-2 border-l border-b border-white/50"></div>
          </div>
          <div className="absolute bottom-3 right-3 opacity-50">
             <div className="w-2 h-2 border-r border-b border-white/50"></div>
          </div>
          
          {/* 中心操作按钮 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="bg-white/10 backdrop-blur-sm p-3 rounded-full border border-white/20 text-white opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300">
                <Maximize2 size={20} />
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};
