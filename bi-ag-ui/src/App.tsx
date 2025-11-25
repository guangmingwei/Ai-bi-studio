import React from 'react';
import { Header } from './components/dashboard/Header';
import { LeftColumn } from './components/dashboard/LeftColumn';
import { RightColumn } from './components/dashboard/RightColumn';
import { CenterMap } from './components/dashboard/CenterMap';
import { Sparkles } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen w-full bg-tech-bg text-tech-text flex flex-col overflow-hidden font-sans selection:bg-tech-cyan selection:text-tech-bg">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-tech-blue/10 blur-[100px] rounded-full"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-tech-cyan/10 blur-[100px] rounded-full"></div>
      </div>

      {/* 顶部标题 */}
      <Header />

      {/* 主内容区 */}
      <main className="flex-1 flex gap-4 p-4 pt-0 overflow-hidden relative z-10">
        {/* 左侧面板 */}
        <div className="w-[450px] shrink-0 flex flex-col h-full animate-slide-right">
          <LeftColumn />
        </div>

        {/* 中间地图/视频区 */}
        <div className="flex-1 h-full min-w-0 flex flex-col animate-zoom-in">
          <CenterMap />
        </div>

        {/* 右侧面板 */}
        <div className="w-[450px] shrink-0 flex flex-col h-full animate-slide-left">
          <RightColumn />
        </div>
      </main>

      {/* AI 助手悬浮按钮 (占位符) */}
      <div className="fixed bottom-6 right-6 z-50 group">
        <button className="relative flex items-center justify-center w-14 h-14 bg-tech-blue/90 hover:bg-tech-blue text-white rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all hover:scale-110 active:scale-95">
          <Sparkles size={24} className="animate-pulse" />
          <div className="absolute inset-0 rounded-full border border-white/30 animate-[ping_2s_linear_infinite]"></div>
        </button>
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-tech-panel border border-tech-panel-border text-xs text-tech-cyan whitespace-nowrap rounded opacity-0 group-hover:opacity-100 transition-opacity">
          Cmd+K 唤醒 AI 助手
        </div>
      </div>
    </div>
  );
}

export default App;
