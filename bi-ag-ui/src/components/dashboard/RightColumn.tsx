import React from 'react';
import { TechPanel } from '../ui/TechPanel';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const trendData = Array.from({ length: 12 }, (_, i) => ({
  time: `${i * 2}:00`,
  value: Math.floor(Math.random() * 50) + 10,
}));

const riskData = [
  { label: '高风险隐患', count: 5, total: 20, color: 'bg-tech-alert', text: 'text-tech-alert' },
  { label: '中风险隐患', count: 15, total: 50, color: 'bg-tech-warning', text: 'text-tech-warning' },
  { label: '低风险隐患', count: 42, total: 100, color: 'bg-tech-success', text: 'text-tech-success' },
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
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis dataKey="time" tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
            <YAxis tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
            <Tooltip 
               contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
               itemStyle={{ color: '#3b82f6' }}
            />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </TechPanel>

      {/* 2. 隐患风险统计 */}
      <TechPanel title="隐患风险管控" className="h-1/4 min-h-[180px]">
        <div className="flex flex-col justify-around h-full py-2 px-1">
           {riskData.map((risk) => (
             <div key={risk.label} className="mb-2">
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-tech-text-dim">{risk.label}</span>
                 <span className={`font-mono font-bold ${risk.text}`}>{risk.count}/{risk.total}</span>
               </div>
               <div className="w-full h-2 bg-tech-bg rounded-full overflow-hidden">
                 <div 
                   className={`h-full rounded-full ${risk.color}`} 
                   style={{ width: `${(risk.count / risk.total) * 100}%` }}
                 ></div>
               </div>
             </div>
           ))}
        </div>
      </TechPanel>

      {/* 3. 实时事件列表 */}
      <TechPanel title="实时安防事件" className="flex-1 min-h-[200px]">
        <div className="flex flex-col gap-2 overflow-y-auto h-full pr-1 custom-scrollbar">
           {eventLog.map((event) => (
             <div key={event.id} className="flex items-center p-2 bg-tech-bg/40 border-l-2 border-tech-panel-border hover:bg-tech-panel-border/20 transition-colors">
                <div className="w-16 text-xs text-tech-text-dim font-mono">{event.time}</div>
                <div className="flex-1 ml-2">
                   <div className="text-sm font-medium text-tech-text">{event.type}</div>
                   <div className="text-xs text-tech-cyan">{event.loc}</div>
                </div>
                <div className={`px-2 py-0.5 text-xs rounded border ${
                  event.level === 'High' ? 'border-tech-alert text-tech-alert bg-tech-alert/10' : 
                  event.level === 'Medium' ? 'border-tech-warning text-tech-warning bg-tech-warning/10' : 
                  'border-tech-success text-tech-success bg-tech-success/10'
                }`}>
                  {event.level}
                </div>
             </div>
           ))}
        </div>
      </TechPanel>
    </div>
  );
};
