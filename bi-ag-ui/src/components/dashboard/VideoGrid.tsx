import React from 'react';
import { MoreHorizontal } from 'lucide-react';

const videos = [
  { id: 1, loc: '北门入口 CAM-01', status: 'LIVE' },
  { id: 2, loc: '2号仓库 CAM-03', status: 'LIVE' },
  { id: 3, loc: '东侧围栏 CAM-07', status: 'REC' },
  { id: 4, loc: '地下车库 CAM-12', status: 'LIVE' },
];

// 使用统一的视频源
const VIDEO_SOURCE = "http://192.168.1.210:18000/m4s/live/stream_3_0.mp4?play_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjI3NjQwNDE3NTcsImlzcyI6InRzaW5nc2VlLWVhc3ljdnIifQ.2onoGTiix77kt44TCuzwtLF6RcXMdDXzrZPQRX5mIu8";

export const VideoGrid: React.FC = () => {
  return (
    <div className="h-full w-full grid grid-cols-2 grid-rows-2 gap-3 p-3">
      {videos.map((v) => (
        <div key={v.id} className="relative rounded-xl overflow-hidden bg-slate-900/80 group shadow-lg border border-white/5">
          <div className="absolute inset-0 bg-black">
            <video 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
              src={VIDEO_SOURCE}
              autoPlay 
              muted 
              loop 
              playsInline
            />
          </div>
          
          {/* 悬浮顶栏 */}
          <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10">
             <span className="text-xs font-medium text-white bg-white/10 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                {v.loc}
             </span>
             <button className="text-white/70 hover:text-white">
                <MoreHorizontal size={16} />
             </button>
          </div>

          {/* 状态指示 - 始终显示 */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
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
        </div>
      ))}
    </div>
  );
};
