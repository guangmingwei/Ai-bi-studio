import React, { useEffect, useRef } from 'react';
import { Maximize2, X } from 'lucide-react';
import { TechPanel } from '../ui/TechPanel';

interface DetailModalProps {
  alert: any;
  isOpen: boolean;
  onClose: () => void;
}

const VIDEO_SOURCE = "http://192.168.1.210:18000/m4s/live/stream_3_0.mp4?play_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjI3NjQwNDE3NTcsImlzcyI6InRzaW5nc2VlLWVhc3ljdnIifQ.2onoGTiix77kt44TCuzwtLF6RcXMdDXzrZPQRX5mIu8";

export const DetailModal: React.FC<DetailModalProps> = ({ alert, isOpen, onClose }) => {
  if (!isOpen || !alert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-12 bg-black/80 backdrop-blur-sm">
      <TechPanel 
        className="w-full max-w-6xl h-[80vh] shadow-2xl animate-zoom-in"
        title={`告警详情: ${alert.title}`}
        rightContent={
          <div className="flex items-center gap-2">
             <span className={`px-2 py-1 rounded text-xs border ${
               alert.level === 'high' ? 'border-red-500/50 text-red-400 bg-red-500/10' :
               alert.level === 'medium' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' :
               'border-blue-500/50 text-blue-400 bg-blue-500/10'
             }`}>
                {alert.level === 'high' ? '严重' : alert.level === 'medium' ? '警告' : '提示'}
             </span>
             <span className="text-slate-500 text-xs">ID: {alert.id}</span>
          </div>
        }
      >
        <div className="flex flex-col h-full">
           {/* Header Actions */}
           <div className="flex justify-between items-center p-4 border-b border-white/5 bg-slate-900/50">
              <div className="flex gap-4 text-sm text-slate-400">
                 <span>发生时间: <span className="text-white">{alert.time}</span></span>
                 <span>位置: <span className="text-white">{alert.location}</span></span>
              </div>
              <div className="flex gap-2">
                 <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>
           </div>

           {/* Content */}
           <div className="flex-1 flex min-h-0">
              {/* Left: Media */}
              <div className="flex-[2] bg-black p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar border-r border-white/10">
                 <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden group border border-white/10">
                    {/* 使用视频流替代静态图 */}
                    <video 
                      src={VIDEO_SOURCE} 
                      className="w-full h-full object-cover" 
                      autoPlay 
                      muted 
                      loop
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                       <div className="p-4 rounded-full bg-white/20 backdrop-blur border border-white/30 text-white">
                          <Maximize2 size={24} />
                       </div>
                    </div>
                 </div>
                 <div className="grid grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="aspect-video bg-slate-800 rounded-lg border border-white/5 hover:border-blue-500 cursor-pointer overflow-hidden">
                         <video 
                           src={VIDEO_SOURCE} 
                           className="w-full h-full object-cover opacity-50 hover:opacity-100 transition-opacity" 
                           muted 
                           playsInline
                         />
                      </div>
                    ))}
                 </div>
              </div>

              {/* Right: Timeline & Info */}
              <div className="flex-1 bg-slate-900 p-6 overflow-y-auto custom-scrollbar">
                 <h3 className="text-lg font-bold text-white mb-4 border-l-4 border-blue-500 pl-3">事件追踪</h3>
                 
                 <div className="relative pl-4 border-l border-white/10 space-y-8">
                    {[
                       { time: '10:24:35', title: '系统检测到异常', desc: 'AI 视觉算法识别到未经授权的人员闯入禁区。' },
                       { time: '10:24:36', title: '自动告警触发', desc: '系统自动触发一级告警，并联动最近的 CAM-03 摄像头进行追踪。' },
                       { time: '10:24:40', title: '安保中心通知', desc: '告警信息已推送到安保中心大屏及巡逻人员手持终端。' },
                       { time: '---', title: '等待处理', desc: '等待安保人员确认处理结果...' }
                    ].map((item, idx) => (
                       <div key={idx} className="relative">
                          <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-800 border border-blue-500"></div>
                          <span className="text-xs text-blue-400 font-mono">{item.time}</span>
                          <h4 className="text-sm font-bold text-slate-200 mt-1">{item.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                       </div>
                    ))}
                 </div>

                 <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h4 className="text-sm font-bold text-blue-300 mb-2">AI 分析建议</h4>
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                       建议立即指派最近的巡逻人员（编号 P-02）前往现场核实。该区域属于高危管控区，请注意安全。
                    </p>
                    <button className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors">
                       指派巡逻人员
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </TechPanel>
    </div>
  );
};
