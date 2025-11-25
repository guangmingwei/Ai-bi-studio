import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './components/dashboard/Header';
import { LeftColumn } from './components/dashboard/LeftColumn';
import { RightColumn } from './components/dashboard/RightColumn';
import { CenterPanel } from './components/dashboard/CenterPanel';
import { SideNav } from './components/navigation/SideNav';
import { useAppStore } from './store';
import { Sparkles, Map, Grid3X3 } from 'lucide-react';
import { CameraTree } from './components/monitor/CameraTree';
import { MonitorGrid } from './components/monitor/MonitorGrid';
import { TechPanel } from './components/ui/TechPanel';

function App() {
  const { isNavOpen, navPosition, toggleNav, centerMode, setCenterMode, currentView } = useAppStore();

  // 全局快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K -> AI Chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCenterMode(centerMode === 'ai-chat' ? 'video-grid' : 'ai-chat');
      }
      // Cmd+O / Ctrl+O -> Side Nav
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        toggleNav();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [centerMode, toggleNav, setCenterMode]);

  // 计算主内容的位移
  const mainVariants = {
    navOpenLeft: { x: 240, width: "calc(100vw - 240px)" },
    navOpenTop: { y: 80, height: "calc(100vh - 80px)" },
    navClosed: { x: 0, y: 0, width: "100vw", height: "100vh" },
  };

  const currentVariant = !isNavOpen 
    ? 'navClosed' 
    : navPosition === 'left' ? 'navOpenLeft' : 'navOpenTop';

  return (
    <div className="fixed inset-0 bg-tech-bg text-tech-text overflow-hidden font-sans selection:bg-tech-cyan selection:text-tech-bg">
      {/* 侧边导航栏 */}
      <SideNav />

      {/* 动态背景层 (由于主内容位移，背景最好固定) */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute inset-0 bg-tech-pattern opacity-20"></div>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.03),transparent_70%)]"></div>
      </div>

      {/* 主界面容器 (受 Sidebar 推挤) */}
      <motion.div
        className="relative flex flex-col h-screen w-screen"
        animate={currentVariant}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* 顶部标题 */}
        <Header />

        {/* 主内容区 - 根据 currentView 切换 */}
        <main className="flex-1 overflow-hidden relative z-10 p-4 pt-0">
          <AnimatePresence mode="wait">
            {/* 1. 综合态势大屏 (Dashboard) */}
            {currentView === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex gap-4 h-full w-full"
              >
                {/* 左侧面板 */}
                <div className="w-[400px] shrink-0 flex flex-col h-full animate-slide-right z-20">
                  <LeftColumn />
                </div>

                {/* 中间多模态区 */}
                <div className="flex-1 h-full min-w-0 flex flex-col animate-zoom-in z-10">
                  <CenterPanel />
                  
                  {/* 底部模式切换条 */}
                  <div className="mt-2 flex justify-center gap-4">
                     <ModeButton 
                       active={centerMode === 'video-grid'} 
                       onClick={() => setCenterMode('video-grid')} 
                       icon={Grid3X3} label="监控墙" 
                     />
                     <ModeButton 
                       active={centerMode === 'map'} 
                       onClick={() => setCenterMode('map')} 
                       icon={Map} label="数字地图" 
                     />
                     <ModeButton 
                       active={centerMode === 'ai-chat'} 
                       onClick={() => setCenterMode('ai-chat')} 
                       icon={Sparkles} label="AI 助手" 
                       highlight
                     />
                  </div>
                </div>

                {/* 右侧面板 */}
                <div className="w-[400px] shrink-0 flex flex-col h-full animate-slide-left z-20">
                  <RightColumn />
                </div>
              </motion.div>
            )}

            {/* 2. 监控中心 (Monitor) */}
            {currentView === 'monitor' && (
              <motion.div
                key="monitor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex gap-4 h-full w-full"
              >
                <div className="w-[300px] h-full">
                   <TechPanel title="区域列表" className="h-full">
                      <CameraTree />
                   </TechPanel>
                </div>
                <div className="flex-1 h-full">
                   <TechPanel title="实时监控矩阵" className="h-full">
                      <MonitorGrid />
                   </TechPanel>
                </div>
              </motion.div>
            )}
            
            {/* 3. 其他页面占位 */}
            {['alert', 'patrol', 'broadcast'].includes(currentView) && (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-full text-slate-500"
              >
                 功能模块 [{currentView}] 开发中...
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  );
}

const ModeButton = ({ active, onClick, icon: Icon, label, highlight }: any) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center gap-2 px-5 py-2 rounded-full border backdrop-blur-md transition-all duration-300
      ${active 
        ? 'bg-blue-500/20 text-blue-200 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-105' 
        : 'bg-slate-900/40 text-slate-400 border-white/10 hover:border-white/30 hover:text-white hover:bg-white/5'
      }
    `}
  >
    <Icon size={16} className={highlight && active ? 'text-pink-400 animate-pulse' : active ? 'text-blue-400' : ''} />
    <span className="text-sm font-medium tracking-wide">{label}</span>
  </button>
);

export default App;
