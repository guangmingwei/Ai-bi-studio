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
import { AlertView } from './components/alert/AlertView';
import { PatrolView } from './components/patrol/PatrolView';
import { BroadcastView } from './components/broadcast/BroadcastView';
import { TechPanel } from './components/ui/TechPanel';
import { GlobalAlert } from './components/ui/GlobalAlert';
import { GuideOverlay } from './components/ui/GuideOverlay';
import { useAppKnowledge } from './ai/hooks/useAppKnowledge';
import { useAppActions } from './ai/hooks/useAppActions';

function App() {
  const { isNavOpen, navPosition, toggleNav, centerMode, setCenterMode, currentView, isEmergency, setEmergency, setCurrentView, setAlertNotification } = useAppStore();

  // Initialize AI Hooks
  useAppKnowledge();
  useAppActions();

  // 模拟随机触发预警 (仅用于演示)
  useEffect(() => {
    // 定义一个触发函数，方便测试
    const triggerDemoAlert = () => {
      // 只有在没有紧急模式且没有当前预警时才触发，避免太烦
      setAlertNotification({
        id: Date.now().toString(),
        title: '检测到区域入侵异常行为',
        image: 'demo-alert', // 在组件内部会使用视频流替代
        source: '2号仓库外围 CAM-05',
        time: new Date().toLocaleTimeString(),
        level: Math.random() > 0.5 ? 'high' : 'medium'
      });
    };

    // 这里的快捷键用于手动触发演示: Cmd+M
    const handleDemoKey = (e: KeyboardEvent) => {
       if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
         e.preventDefault();
         triggerDemoAlert();
       }
    };

    window.addEventListener('keydown', handleDemoKey);
    return () => window.removeEventListener('keydown', handleDemoKey);
  }, [setAlertNotification]);

  // 全局快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K -> AI Chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCurrentView('dashboard');
        setCenterMode(centerMode === 'ai-chat' ? 'video-grid' : 'ai-chat');
      }
      // Cmd+O / Ctrl+O -> Side Nav
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        toggleNav();
      }
      // Cmd+L / Ctrl+L -> Emergency Mode
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        // 如果已经在紧急模式，是否需要取消？根据需求描述，这里是触发。
        // 可以做成 toggle 或者只能触发。通常紧急模式只能触发，需要手动确认关闭。
        // 但为了测试方便，我们暂且只负责触发。
        setEmergency(true);
        setCurrentView('monitor');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [centerMode, toggleNav, setCenterMode, setEmergency, setCurrentView]);

  // 计算主内容的位移
  const mainVariants = {
    navOpenLeft: { x: 240, width: "calc(100vw - 240px)" },
    navOpenTop: { y: 80, height: "calc(100vh - 80px)" },
    navClosed: { x: 0, y: 0, width: "100vw", height: "100vh" },
  };

  const currentVariant = !isNavOpen 
    ? 'navClosed' 
    : navPosition === 'left' ? 'navOpenLeft' : 'navOpenTop';

  // 当顶部导航激活时，标题栏需要留出空间（或者融合）
  // 这里我们通过调整标题栏的 z-index 或位置来处理融合
  const isTopNav = isNavOpen && navPosition === 'top';

  return (
    <div className="fixed inset-0 bg-tech-bg text-tech-text overflow-hidden font-sans selection:bg-tech-cyan selection:text-tech-bg">
      {/* 侧边导航栏 - 注意 z-index 层级高于 Header */}
      <SideNav />
      
      {/* 全局预警弹窗 */}
      <GlobalAlert />

      {/* 新手引导层 */}
      <GuideOverlay />

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
        {/* 顶部标题 - 当顶部导航存在时， Header 内部会处理融合逻辑 */}
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

            {/* 3. 预警中心 (Alert) */}
            {currentView === 'alert' && (
              <motion.div
                key="alert"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full w-full"
              >
                <AlertView />
              </motion.div>
            )}

            {/* 4. 巡查治理 (Patrol) */}
            {currentView === 'patrol' && (
              <motion.div
                key="patrol"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full w-full"
              >
                <PatrolView />
              </motion.div>
            )}
            
            {/* 5. 广播喊话 (Broadcast) */}
            {currentView === 'broadcast' && (
              <motion.div
                key="broadcast"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full w-full"
              >
                <BroadcastView />
              </motion.div>
            )}
            
            {/* 6. 其他页面占位 */}
            {/* 预留给未来模块 */}
            {false && (
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
      {/* 紧急模式全屏红色警报 */}
      <AnimatePresence>
        {isEmergency && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
             {/* 红色闪烁背景 */}
             <div className="absolute inset-0 bg-red-500/30 animate-pulse" />
             <div className="absolute inset-0 border-[20px] border-red-500/50 animate-pulse" />
             
             {/* 警报文字 - 允许点击交互以解除 */}
             <div className="relative pointer-events-auto bg-black/80 border border-red-500 p-8 rounded-2xl flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(239,68,68,0.5)]">
                <div className="text-6xl animate-bounce">🚨</div>
                <h1 className="text-4xl font-bold text-red-500 tracking-widest uppercase">Emergency Alert</h1>
                <p className="text-red-300 text-lg">全域紧急疏散广播正在播放中...</p>
                <button 
                  onClick={() => setEmergency(false)}
                  className="mt-4 px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-lg transition-colors"
                >
                  解除警报
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
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
