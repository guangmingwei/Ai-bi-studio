import React from 'react';
import { twMerge } from 'tailwind-merge';

interface TechPanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const TechPanel: React.FC<TechPanelProps> = ({ children, className, title }) => {
  return (
    <div className={twMerge("relative bg-tech-panel border border-tech-panel-border/30 backdrop-blur-sm p-4 flex flex-col", className)}>
      {/* Corners */}
      <div className="absolute -top-[1px] -left-[1px] w-3 h-3 border-l-2 border-t-2 border-tech-cyan"></div>
      <div className="absolute -top-[1px] -right-[1px] w-3 h-3 border-r-2 border-t-2 border-tech-cyan"></div>
      <div className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-l-2 border-b-2 border-tech-cyan"></div>
      <div className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-r-2 border-b-2 border-tech-cyan"></div>

      {title && (
        <div className="mb-4 flex items-center gap-2 shrink-0">
           <div className="w-1 h-4 bg-tech-cyan shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
           <h3 className="text-lg font-bold text-tech-text tracking-wider uppercase font-mono">{title}</h3>
           <div className="flex-1 h-[1px] bg-gradient-to-r from-tech-panel-border to-transparent ml-2 opacity-50"></div>
        </div>
      )}
      
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
};
