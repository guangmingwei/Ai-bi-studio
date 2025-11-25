import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Cctv, Activity, Megaphone, Settings, ArrowLeftToLine, ArrowUpToLine, LayoutDashboard, Globe } from 'lucide-react';
import { useAppStore } from '../../store';
import type { PageView } from '../../store';
import { twMerge } from 'tailwind-merge';

const menuItems = [
  { id: 'dashboard', label: '综合态势', icon: Globe, color: 'text-purple-400' },
  { id: 'monitor', label: '监控中心', icon: Cctv, color: 'text-blue-400' },
  { id: 'alert', label: '预警中心', icon: ShieldAlert, color: 'text-pink-400' },
  { id: 'patrol', label: '巡查治理', icon: Activity, color: 'text-amber-400' },
  { id: 'broadcast', label: '广播喊话', icon: Megaphone, color: 'text-emerald-400' },
];

export const SideNav: React.FC = () => {
  const { isNavOpen, navPosition, setNavPosition, currentView, setCurrentView } = useAppStore();
  const isLeft = navPosition === 'left';

  const variants = {
    left: {
      open: { x: 0, opacity: 1 },
      closed: { x: -100, opacity: 0 },
    },
    top: {
      open: { y: 0, opacity: 1 },
      closed: { y: -50, opacity: 0 },
    }
  };

  if (!isNavOpen) return null;

  return (
    <motion.div
      initial="closed"
      animate="open"
      variants={isLeft ? variants.left : variants.top}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={twMerge(
        "fixed z-[60] backdrop-blur-xl border-white/10 transition-all duration-300",
        isLeft 
          ? "left-4 top-24 bottom-4 w-64 rounded-2xl border bg-slate-900/90 shadow-2xl flex flex-col" 
          : "top-6 right-8 h-12 rounded-full border bg-slate-900/80 flex items-center px-2 shadow-lg"
      )}
    >
      {/* Logo Area (Only for Left) */}
      {isLeft && (
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
               <LayoutDashboard size={18} />
            </div>
            <span className="font-bold tracking-wide">控制台</span>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className={twMerge("flex gap-1", isLeft ? "flex-col p-4 flex-1 overflow-y-auto" : "flex-row items-center")}>
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as PageView)}
              className={twMerge(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all group border border-transparent",
                isActive 
                  ? "bg-blue-600/20 border-blue-500/30" 
                  : "hover:bg-white/5 hover:border-white/10",
                !isLeft && "py-1.5 px-3 rounded-full text-sm"
              )}
            >
              <item.icon size={isLeft ? 20 : 16} className={twMerge(item.color, isActive && "scale-110 drop-shadow-[0_0_5px_currentColor]")} />
              <span className={twMerge("font-medium transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200", !isLeft && "whitespace-nowrap")}>
                {item.label}
              </span>
              
              {/* Active Indicator for Left */}
              {isLeft && isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-400 rounded-r shadow-[0_0_10px_#60a5fa]"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / Toggle (Only for Left) */}
      {isLeft && (
        <div className="p-4 border-t border-white/5 flex justify-between items-center bg-black/20 rounded-b-2xl">
           <button 
             onClick={() => setNavPosition('top')}
             className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-xs"
           >
             <ArrowUpToLine size={16} />
             <span>顶部导航</span>
           </button>
           <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
             <Settings size={16} />
           </button>
        </div>
      )}

      {/* Config button for Top mode */}
      {!isLeft && (
        <div className="w-[1px] h-6 bg-white/10 mx-2"></div>
      )}
      {!isLeft && (
         <button 
           onClick={() => setNavPosition('left')}
           className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
           title="切换至侧边"
         >
           <ArrowLeftToLine size={16} />
         </button>
      )}
    </motion.div>
  );
};
