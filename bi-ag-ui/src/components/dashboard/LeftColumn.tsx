import React, { useEffect, useState } from 'react';
import { TechPanel } from '../ui/TechPanel';
import { AlertTriangle, CheckCircle, Clock, Activity, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

const deviceData = [
  { name: '在线', value: 850, color: '#38bdf8' },
  { name: '离线', value: 120, color: '#94a3b8' },
  { name: '故障', value: 30, color: '#f472b6' },
];

const rankingData = [
  { name: '北门入口', value: 420 },
  { name: '2号仓库', value: 350 },
  { name: '员工食堂', value: 280 },
  { name: '东侧围栏', value: 210 },
  { name: '地下车库', value: 150 },
];

// 模拟数字增长组件
const AnimatedNumber = ({ value }: { value: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const target = parseInt(value);
  
  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quart
      const ease = 1 - Math.pow(1 - progress, 4);
      
      setDisplayValue(Math.floor(start + (target - start) * ease));

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [target]);

  return <span>{displayValue}</span>;
};

const StatCard = ({ title, value, icon, color, bgClass }: { title: string, value: string, icon: React.ReactNode, color: string, bgClass: string }) => (
  <div className={`relative overflow-hidden p-3 rounded-xl border border-white/5 ${bgClass} group transition-all hover:scale-105 hover:border-white/20`}>
    {/* 流光扫描效果 */}
    <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:animate-[shimmer_1s_infinite]"></div>
    
    <div className="flex justify-between items-start relative z-10">
      <div>
         <div className="text-xs text-slate-400 mb-1 font-medium">{title}</div>
         <div className={`text-2xl font-bold font-mono ${color} flex items-baseline gap-1`}>
            <AnimatedNumber value={value} />
            <span className="text-[10px] text-slate-500 font-normal">件</span>
         </div>
      </div>
      <div className={`p-2 rounded-lg bg-white/5 backdrop-blur-sm text-white/80 shadow-inner`}>
         {icon}
      </div>
    </div>
    
    <div className={`absolute bottom-0 left-0 w-full h-[2px] ${color.replace('text-', 'bg-')} opacity-30 group-hover:opacity-100 transition-opacity`}></div>
  </div>
);

export const LeftColumn: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 h-full w-full">
      <TechPanel title="全域预警态势" className="h-1/3 min-h-[220px]">
        <div className="grid grid-cols-2 gap-3 h-full pb-2">
           <StatCard title="今日告警" value="128" icon={<Activity size={16} />} color="text-blue-400" bgClass="bg-blue-500/5" />
           <StatCard title="待处理" value="12" icon={<AlertTriangle size={16} />} color="text-pink-400" bgClass="bg-pink-500/5" />
           <StatCard title="处理中" value="45" icon={<Clock size={16} />} color="text-amber-400" bgClass="bg-amber-500/5" />
           <StatCard title="已解决" value="71" icon={<CheckCircle size={16} />} color="text-emerald-400" bgClass="bg-emerald-500/5" />
        </div>
      </TechPanel>

      <TechPanel title="感知设备概览" className="h-1/3 min-h-[200px]">
        <div className="flex h-full items-center">
           <div className="w-1/2 h-full relative group cursor-pointer">
             {/* 旋转光环 */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border border-dashed border-blue-500/30 animate-[spin_10s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity"></div>
             
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={deviceData}
                   innerRadius={45}
                   outerRadius={65}
                   paddingAngle={4}
                   dataKey="value"
                   stroke="none"
                   animationDuration={1500}
                   animationBegin={200}
                 >
                   {deviceData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity" />
                   ))}
                 </Pie>
               </PieChart>
             </ResponsiveContainer>
             
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-2xl font-bold text-white drop-shadow-md"><AnimatedNumber value="85" />%</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Online</div>
             </div>
           </div>
           
           <div className="w-1/2 flex flex-col gap-3 justify-center pr-4">
              {deviceData.map((item) => (
                <div key={item.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full transition-transform group-hover:scale-150" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-slate-300">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-white"><AnimatedNumber value={item.value.toString()} /></span>
                </div>
              ))}
           </div>
        </div>
      </TechPanel>

      <TechPanel title="热点区域监控 TOP5" className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rankingData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={70} axisLine={false} tickLine={false} />
            <RechartsTooltip 
               cursor={{fill: 'rgba(255,255,255,0.05)'}}
               contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
            />
            <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={12} animationDuration={1500}>
               {rankingData.map((entry, index) => (
                 <Cell key={`cell-${index}`} fill={index < 3 ? '#38bdf8' : '#334155'} className="transition-all hover:opacity-80" />
               ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </TechPanel>
    </div>
  );
};
