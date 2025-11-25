import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Cctv, Activity, Megaphone, Settings, ArrowLeftToLine, ArrowUpToLine, LayoutDashboard } from 'lucide-react';
import { useAppStore } from '../../store';
import { twMerge } from 'tailwind-merge';

const menuItems = [
  { id: 'monitor', label: '监控中心', icon: Cctv, color: 'text-blue-400' },
  { id: 'alert', label: '预警中心', icon: ShieldAlert, color: 'text-pink-400' },
  { id: 'patrol', label: '巡查治理', icon: Activity, color: 'text-amber-400' },
  { id: 'broadcast', label: '广播喊话', icon: Megaphone, color: 'text-emerald-400' },
];

export const SideNav: React.FC = () => {
  const { isNavOpen, navPosition, setNavPosition } = useAppStore();
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
          ? "left-4 top-24 bottom-4 w-64 rounded-2xl border bg-slate-900/80 shadow-2xl flex flex-col" 
          : "top-6 right-8 h-12 rounded-full border bg-slate-900/60 flex items-center px-2 shadow-lg"
      )}
    >
      {/* Logo Area (Only for Left) */}
      {isLeft && (
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
               <LayoutDashboard size={18} />
            </div>
            <span className="font-bold tracking-wide">控制台</span>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className={twMerge("flex gap-2", isLeft ? "flex-col p-4 flex-1 overflow-y-auto" : "flex-row items-center")}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={twMerge(
              "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all group hover:bg-white/5 border border-transparent hover:border-white/10",
              !isLeft && "py-1.5 px-3 rounded-full text-sm"
            )}
          >
            <item.icon size={isLeft ? 20 : 16} className={`${item.color} group-hover:scale-110 transition-transform`} />
            <span className={twMerge("font-medium text-slate-300 group-hover:text-white", !isLeft && "whitespace-nowrap")}>
              {item.label}
            </span>
            
            {/* Active Indicator for Left */}
            {isLeft && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-blue-400 rounded-r group-hover:h-8 transition-all duration-300"></div>
            )}
          </button>
        ))}
      </div>

      {/* Footer / Toggle (Only for Left, Top has separate toggle) */}
      {isLeft && (
        <div className="p-4 border-t border-white/5 flex justify-between items-center bg-black/20 rounded-b-2xl">
           <button 
             onClick={() => setNavPosition('top')}
             className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-xs"
           >
             <ArrowUpToLine size={16} />
             <span>切换至顶部</span>
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
