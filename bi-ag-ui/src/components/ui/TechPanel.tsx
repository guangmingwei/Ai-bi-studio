import React from 'react';
import { twMerge } from 'tailwind-merge';

interface TechPanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  rightContent?: React.ReactNode;
}

export const TechPanel: React.FC<TechPanelProps> = ({ children, className, title, rightContent }) => {
  return (
    <div className={twMerge("relative flex flex-col bg-glass rounded-xl border border-white/5 overflow-hidden shadow-lg", className)}>
      {/* 顶部发光装饰线 */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-tech-primary/50 to-transparent"></div>
      
      {/* 标题栏 */}
      {title && (
        <div className="flex items-center justify-between px-4 py-3 shrink-0 relative">
           {/* 标题背景渐变 */}
           <div className="absolute inset-0 bg-gradient-to-r from-tech-primary/10 to-transparent opacity-50"></div>
           
           <div className="relative flex items-center gap-2 z-10">
              {/* 装饰点 */}
              <div className="w-1 h-4 bg-tech-primary rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]"></div>
              <h3 className="text-base font-semibold text-white tracking-wide text-shadow-sm">{title}</h3>
           </div>

           {rightContent && (
             <div className="relative z-10">
               {rightContent}
             </div>
           )}
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 relative p-4 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
