import React, { useState } from 'react';
import { TechPanel } from '../ui/TechPanel';
import { PatrolOverview } from './PatrolOverview';
import { PatrolList } from './PatrolList';
import { CreatePlanModal } from './CreatePlanModal';
import { PatrolDetailModal } from './PatrolDetailModal';
import { AnimatePresence } from 'framer-motion';

export const PatrolView: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | undefined>(undefined);

  const handleCreate = (data: any) => {
    console.log('New Plan:', data);
    setIsCreateOpen(false);
  };

  return (
    <div className="flex gap-4 h-full w-full relative">
      {/* 左侧：概览 (1/3) */}
      <div className="w-1/3 h-full flex flex-col min-w-[300px]">
        <PatrolOverview />
      </div>

      {/* 右侧：计划管理 (2/3) */}
      <div className="w-2/3 h-full flex flex-col min-w-0">
        <TechPanel title="巡查计划与记录" className="h-full">
           <PatrolList 
             onCreate={() => setIsCreateOpen(true)} 
             onOpenDetail={(id) => setDetailId(id)}
           />
        </TechPanel>
      </div>

      <AnimatePresence>
        {isCreateOpen && (
          <CreatePlanModal 
            isOpen={isCreateOpen} 
            onClose={() => setIsCreateOpen(false)} 
            onSubmit={handleCreate}
          />
        )}
        {detailId !== undefined && (
          <PatrolDetailModal 
            isOpen={detailId !== undefined}
            onClose={() => setDetailId(undefined)}
            taskId={detailId}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
