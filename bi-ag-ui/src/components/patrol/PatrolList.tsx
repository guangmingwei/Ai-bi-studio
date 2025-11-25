import React from 'react';
import { Plus, Clock, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';

const tasks = [
  { id: 1, name: '全厂积水排查', area: '全厂区', items: ['积水检测'], time: '10:42', status: 'running', progress: 45, risks: 0 },
  { id: 2, name: '早班安全巡检', area: '生产车间 A', items: ['安全帽', '离岗'], time: '08:00', status: 'completed', progress: 100, risks: 2 },
  { id: 3, name: '夜间周界安防', area: '外围围墙', items: ['翻越', '徘徊'], time: '昨日 22:00', status: 'completed', progress: 100, risks: 0 },
];

interface PatrolListProps {
  onCreate: () => void;
  onOpenDetail: (id: number) => void;
}

export const PatrolList: React.FC<PatrolListProps> = ({ onCreate, onOpenDetail }) => {
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
         <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors border border-white/5">全部任务</button>
            <button className="px-3 py-1.5 rounded-lg text-slate-400 text-sm hover:text-white hover:bg-white/5 transition-colors">执行中</button>
            <button className="px-3 py-1.5 rounded-lg text-slate-400 text-sm hover:text-white hover:bg-white/5 transition-colors">已完成</button>
         </div>
         <button 
           onClick={onCreate}
           className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all hover:scale-105"
         >
            <Plus size={16} /> 新建巡查计划
         </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
         {tasks.map(task => (
           <div 
             key={task.id} 
             className="bg-slate-900/40 border border-white/5 rounded-xl p-4 hover:border-blue-500/30 transition-all group cursor-pointer"
             onClick={() => onOpenDetail(task.id)}
           >
              <div className="flex justify-between items-start mb-3">
                 <div>
                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                       {task.name}
                       {task.status === 'running' && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 animate-pulse">执行中</span>
                       )}
                    </h3>
                    <div className="flex gap-4 mt-1 text-xs text-slate-400">
                       <span className="flex items-center gap-1"><Clock size={12} /> {task.time}</span>
                       <span>区域: {task.area}</span>
                       <span>检查项: {task.items.join(', ')}</span>
                    </div>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className={`text-2xl font-mono font-bold ${task.risks > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                       {task.risks}
                    </span>
                    <span className="text-[10px] text-slate-500">发现隐患</span>
                 </div>
              </div>

              {/* Progress */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div 
                   className={`h-full rounded-full ${task.status === 'running' ? 'bg-blue-500' : 'bg-emerald-500'}`} 
                   style={{ width: `${task.progress}%` }}
                 ></div>
              </div>
              
              <div className="mt-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                 <span className="text-slate-500">任务ID: PATROL-{20230000 + task.id}</span>
                 <button className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                    查看详情 <ChevronRight size={12} />
                 </button>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

