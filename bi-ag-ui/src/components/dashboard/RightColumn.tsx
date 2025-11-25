import React from 'react';
import { TechPanel } from '../ui/TechPanel';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AlertTriangle } from 'lucide-react';

const trendData = Array.from({ length: 12 }, (_, i) => ({
  time: `${i * 2}:00`,
  value: Math.floor(Math.random() * 50) + 10,
}));

const riskData = [
  { label: '高风险隐患', count: 5, total: 20, color: 'bg-pink-500', text: 'text-pink-400' },
  { label: '中风险隐患', count: 15, total: 50, color: 'bg-amber-500', text: 'text-amber-400' },
  { label: '低风险隐患', count: 42, total: 100, color: 'bg-emerald-500', text: 'text-emerald-400' },
];

const eventLog = [
  { id: 1, time: '10:42:15', loc: '2号仓库', type: '未佩戴安全帽', level: 'High' },
  { id: 2, time: '10:41:03', loc: '北门入口', type: '车辆违停', level: 'Medium' },
  { id: 3, time: '10:38:55', loc: '东侧围栏', type: '人员翻越', level: 'High' },
  { id: 4, time: '10:35:20', loc: '地下车库', type: '烟雾报警', level: 'Medium' },
  { id: 5, time: '10:30:11', loc: '办公楼', type: '陌生人徘徊', level: 'Low' },
];

export const RightColumn: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 h-full w-full">
      {/* 1. AI预警趋势 */}
      <TechPanel title="AI预警趋势 (24H)" className="h-1/3 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="time" tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
            <YAxis tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
            <Tooltip 
               contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
               itemStyle={{ color: '#38bdf8' }}
               cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#38bdf8" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </TechPanel>

      {/* 2. 隐患风险统计 */}
      <TechPanel title="隐患风险管控" className="h-1/4 min-h-[180px]">
        <div className="flex flex-col justify-around h-full py-2 px-2">
           {riskData.map((risk) => (
             <div key={risk.label} className="mb-2 group">
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-slate-400 group-hover:text-white transition-colors">{risk.label}</span>
                 <span className={`font-mono font-bold ${risk.text}`}>{risk.count}/{risk.total}</span>
               </div>
               <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div 
                   className={`h-full rounded-full ${risk.color} relative overflow-hidden`} 
                   style={{ width: `${(risk.count / risk.total) * 100}%` }}
                 >
                    {/* 进度条光效 */}
                    <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>
                 </div>
               </div>
             </div>
           ))}
        </div>
      </TechPanel>

      {/* 3. 实时事件列表 */}
      <TechPanel title="实时安防事件" className="flex-1 min-h-[200px]">
        <div className="flex flex-col gap-2 overflow-y-auto h-full pr-1 custom-scrollbar">
           {eventLog.map((event) => (
             <div key={event.id} className="group flex items-center p-3 bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-all hover:bg-white/10 cursor-pointer">
                <div className="w-16 text-xs text-slate-500 font-mono group-hover:text-slate-300">{event.time}</div>
                <div className="flex-1 ml-2">
                   <div className="text-sm font-medium text-slate-200 group-hover:text-white">{event.type}</div>
                   <div className="text-xs text-blue-400/70 group-hover:text-blue-400">{event.loc}</div>
                </div>
                <div className={`px-2 py-1 text-[10px] rounded border flex items-center gap-1 ${
                  event.level === 'High' ? 'border-pink-500/30 text-pink-400 bg-pink-500/10' : 
                  event.level === 'Medium' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 
                  'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                }`}>
                  {event.level === 'High' && <AlertTriangle size={10} />}
                  {event.level}
                </div>
             </div>
           ))}
        </div>
      </TechPanel>
    </div>
  );
};
