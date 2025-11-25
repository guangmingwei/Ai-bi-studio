import React from 'react';
import { TechPanel } from '../ui/TechPanel';
import { AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

// Mock Data
const deviceData = [
  { name: '在线', value: 850, color: '#10b981' },
  { name: '离线', value: 120, color: '#64748b' },
  { name: '故障', value: 30, color: '#ef4444' },
];

const rankingData = [
  { name: '北门入口', value: 420 },
  { name: '2号仓库', value: 350 },
  { name: '员工食堂', value: 280 },
  { name: '东侧围栏', value: 210 },
  { name: '地下车库', value: 150 },
];

const StatCard = ({ title, value, icon, color, animate = false }: { title: string, value: string, icon: React.ReactNode, color: string, animate?: boolean }) => (
  <div className={`bg-tech-bg/50 border border-tech-panel-border/50 p-3 rounded flex items-center justify-between ${animate ? 'animate-pulse border-tech-alert/50' : ''}`}>
    <div>
      <div className="text-xs text-tech-text-dim mb-1">{title}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
    </div>
    <div className={`p-2 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
      {icon}
    </div>
  </div>
);

export const LeftColumn: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 h-full w-full">
      {/* 1. 实时预警数据 */}
      <TechPanel title="实时预警统计" className="h-1/3 min-h-[200px]">
        <div className="grid grid-cols-2 gap-3 h-full p-2">
           <StatCard title="今日预警" value="128" icon={<Activity size={18} />} color="text-tech-blue" />
           <StatCard title="待处置" value="12" icon={<AlertTriangle size={18} />} color="text-tech-alert" animate />
           <StatCard title="处置中" value="45" icon={<Clock size={18} />} color="text-tech-warning" />
           <StatCard title="已处置" value="71" icon={<CheckCircle size={18} />} color="text-tech-success" />
        </div>
      </TechPanel>

      {/* 2. 在线设备状态 */}
      <TechPanel title="在线设备状态" className="h-1/3 min-h-[200px]">
        <div className="flex h-full items-center">
           <div className="w-1/2 h-full relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={deviceData}
                   innerRadius={40}
                   outerRadius={60}
                   paddingAngle={5}
                   dataKey="value"
                   stroke="none"
                 >
                   {deviceData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
               </PieChart>
             </ResponsiveContainer>
             {/* Center Text */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-2xl font-bold text-white">85%</div>
                <div className="text-xs text-tech-text-dim">在线率</div>
             </div>
           </div>
           <div className="w-1/2 flex flex-col gap-2 justify-center pl-4">
              {deviceData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-tech-text-dim">{item.name}</span>
                  <span className="text-sm font-bold font-mono ml-auto">{item.value}</span>
                </div>
              ))}
           </div>
        </div>
      </TechPanel>

      {/* 3. 抓拍摄像头排行 */}
      <TechPanel title="抓拍摄像头排行" className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rankingData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={70} />
            <RechartsTooltip 
               contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
               itemStyle={{ color: '#f1f5f9' }}
               cursor={{fill: 'rgba(255,255,255,0.05)'}}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15}>
               {rankingData.map((entry, index) => (
                 <Cell key={`cell-${index}`} fill={index < 3 ? '#06b6d4' : '#1e3a8a'} />
               ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </TechPanel>
    </div>
  );
};
