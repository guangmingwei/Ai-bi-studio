import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Radio, Siren, Volume2 } from 'lucide-react';
import { useAppStore } from '../../store';

interface BroadcastPanelProps {
  isAllBroadcast: boolean;
  onToggleAllBroadcast: (active: boolean) => void;
  selectedCount: number;
}

export const BroadcastPanel: React.FC<BroadcastPanelProps> = ({ 
  isAllBroadcast, 
  onToggleAllBroadcast,
  selectedCount
}) => {
  const [isTalking, setIsTalking] = useState(false);
  const { setEmergency, setCurrentView } = useAppStore();
  
  // 模拟音波数据
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(10));
  const animationRef = useRef<number>();

  useEffect(() => {
    if (isTalking) {
      const updateLevels = () => {
        setAudioLevels(prev => prev.map(() => Math.random() * 40 + 10));
        animationRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } else {
      setAudioLevels(new Array(20).fill(5));
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isTalking]);

  const handleEmergency = () => {
    setEmergency(true);
    setCurrentView('monitor');
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* 顶部控制栏 */}
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isTalking ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-slate-300 font-medium">
              {isTalking ? '正在喊话中...' : '设备就绪'}
            </span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-sm text-slate-400">
            已选中设备: <span className="text-blue-400 font-bold">{selectedCount}</span> 台
          </span>
        </div>

        <div className="flex items-center gap-4">
           <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              className="hidden"
              checked={isAllBroadcast}
              onChange={(e) => onToggleAllBroadcast(e.target.checked)}
            />
            <div className={`w-10 h-6 rounded-full relative transition-colors ${isAllBroadcast ? 'bg-blue-500' : 'bg-slate-700'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isAllBroadcast ? 'left-5' : 'left-1'}`} />
            </div>
            <span className={`text-sm font-medium transition-colors ${isAllBroadcast ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}`}>
              全域喊话
            </span>
          </label>
        </div>
      </div>

      {/* 中间主控制区 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/50 to-slate-900/20 border border-white/5">
        
        {/* 音波可视化 */}
        <div className="flex items-end gap-1 h-32 mb-8">
          {audioLevels.map((h, i) => (
            <div 
              key={i}
              className={`w-3 rounded-t-sm transition-all duration-75 ${isTalking ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700/50'}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        {/* PTT 按钮 */}
        <button
          onClick={() => setIsTalking(!isTalking)}
          className={`
            relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300
            ${isTalking 
              ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)] scale-105' 
              : 'bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.5)] hover:scale-105'
            }
          `}
        >
          {/* 波纹效果环 */}
          {isTalking && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-20" />
              <div className="absolute inset-[-20px] rounded-full border border-red-500 animate-pulse opacity-10" />
            </>
          )}
          
          <div className="flex flex-col items-center gap-2 text-white z-10">
            {isTalking ? <MicOff size={48} /> : <Mic size={48} />}
            <span className="text-lg font-bold tracking-wider">
              {isTalking ? '点击停止' : '点击喊话'}
            </span>
          </div>
        </button>

        <div className="text-slate-400 text-sm mt-4 bg-black/20 px-4 py-2 rounded-full">
          当前模式: {isAllBroadcast ? '全域广播' : '定向广播'}
        </div>
      </div>

      {/* 底部紧急操作区 */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
            <Siren size={24} />
          </div>
          <div>
            <h3 className="text-red-200 font-bold">紧急疏散模式</h3>
            <p className="text-red-400/60 text-xs">触发后将全域广播警报并跳转监控</p>
          </div>
        </div>
        <button 
          onClick={handleEmergency}
          className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg shadow-red-900/20 transition-colors flex items-center gap-2"
        >
          <Volume2 size={18} />
          立即触发 (Cmd+L)
        </button>
      </div>
    </div>
  );
};

