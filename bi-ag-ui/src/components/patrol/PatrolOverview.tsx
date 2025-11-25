import React from 'react';
import { TechPanel } from '../ui/TechPanel';
import { Activity, CheckCircle, AlertTriangle, Loader2, Camera, BrainCircuit } from 'lucide-react';

const stats = [
  { label: '今日巡查', value: '12', unit: '次', color: 'text-blue-400' },
  { label: '发现隐患', value: '5', unit: '个', color: 'text-red-400' },
  { label: '自动复核', value: '3', unit: '项', color: 'text-emerald-400' },
];

export const PatrolOverview: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 1. 核心数据 */}
      <TechPanel title="巡查效能概览" className="shrink-0">
        <div className="grid grid-cols-3 gap-2 p-2">
           {stats.map(s => (
             <div key={s.label} className="bg-white/5 rounded-lg p-3 flex flex-col items-center border border-white/5">
                <span className="text-xs text-slate-400 mb-1">{s.label}</span>
                <div className={`text-xl font-bold font-mono ${s.color}`}>
                   {s.value}<span className="text-xs text-slate-500 ml-1">{s.unit}</span>
                </div>
             </div>
           ))}
        </div>
      </TechPanel>

      {/* 2. 实时任务状态 */}
      <TechPanel title="AI 实时执行状态" className="flex-1 flex flex-col">
        <div className="p-4 bg-blue-600/10 border-b border-blue-500/20 flex items-center gap-4">
           <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <BrainCircuit size={20} className="text-blue-400" />
           </div>
           <div className="flex-1">
              <h4 className="text-sm font-bold text-white flex justify-between">
                 正在执行: 全厂积水排查
                 <span className="text-blue-400">45%</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">正在分析 CAM-07 (地下车库)</p>
              {/* 进度条 */}
              <div className="mt-2 w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 w-[45%] relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite]"></div>
                 </div>
              </div>
           </div>
        </div>

        {/* 执行日志流 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
           {[1,2,3,4,5].map((_, i) => (
             <div key={i} className="flex gap-3 items-start">
                <div className="flex flex-col items-center">
                   <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`}></div>
                   {i !== 4 && <div className="w-[1px] h-full bg-slate-800 my-1"></div>}
                </div>
                <div className={`text-xs ${i === 0 ? 'text-white' : 'text-slate-500'}`}>
                   <p className="font-mono mb-0.5">10:45:{30 - i * 5}</p>
                   <p>{i === 0 ? '正在连接 CAM-07 视频流...' : 'CAM-06 分析完成，未发现异常。'}</p>
                </div>
             </div>
           ))}
        </div>
      </TechPanel>
    </div>
  );
};

