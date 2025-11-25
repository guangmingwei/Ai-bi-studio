import React, { useState, useEffect } from 'react';

export const Header: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-20 flex items-center justify-center mb-2 shrink-0 z-50">
      {/* Background Decoration */}
      <div className="absolute bottom-0 w-full h-[2px] bg-gradient-to-r from-transparent via-tech-blue to-transparent opacity-70"></div>
      <div className="absolute bottom-[-4px] w-1/2 h-[2px] bg-gradient-to-r from-transparent via-tech-cyan to-transparent opacity-50 blur-[2px]"></div>
      
      {/* Center Title */}
      <div className="relative z-10 text-center">
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-tech-blue tracking-[0.15em] filter drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">
          AI综合安防治理风险监控中心
        </h1>
        <div className="flex justify-center mt-1 gap-2 opacity-60">
           <span className="h-[2px] w-12 bg-tech-cyan"></span>
           <span className="h-[2px] w-2 bg-tech-cyan"></span>
           <span className="h-[2px] w-2 bg-tech-cyan"></span>
           <span className="h-[2px] w-12 bg-tech-cyan"></span>
        </div>
      </div>

      {/* Right Side Time */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-4">
         <div className="text-right hidden md:block">
            <div className="text-2xl font-mono font-bold text-tech-text text-shadow-glow">
              {time.toLocaleTimeString('zh-CN', { hour12: false })}
            </div>
            <div className="text-sm text-tech-text-dim font-mono">
              {time.toLocaleDateString('zh-CN')}
            </div>
         </div>
      </div>
    </div>
  );
};
