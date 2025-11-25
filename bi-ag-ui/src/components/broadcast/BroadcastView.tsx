import React, { useState } from 'react';
import { DeviceTree } from './DeviceTree';
import { BroadcastPanel } from './BroadcastPanel';
import { TechPanel } from '../ui/TechPanel';

export const BroadcastView: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllBroadcast, setIsAllBroadcast] = useState(false);
  const [selectAllTrigger, setSelectAllTrigger] = useState(0); // 用于触发子组件全选

  const handleToggleAllBroadcast = (active: boolean) => {
    setIsAllBroadcast(active);
    if (active) {
      // 触发全选逻辑
      setSelectAllTrigger(prev => prev + 1);
    } else {
      // 取消全选逻辑 - 这里可以选择清空或者保持上次选择，根据习惯清空比较合理
      setSelectedIds([]);
    }
  };

  return (
    <div className="flex gap-4 h-full w-full p-4">
      {/* 左侧设备列表 */}
      <div className="w-[320px] h-full flex flex-col animate-slide-right">
        <TechPanel title="广播设备列表" className="h-full">
          <DeviceTree 
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            selectAllTrigger={selectAllTrigger}
          />
        </TechPanel>
      </div>

      {/* 右侧控制台 */}
      <div className="flex-1 h-full animate-zoom-in">
        <TechPanel title="实时喊话控制台" className="h-full">
          <BroadcastPanel 
            isAllBroadcast={isAllBroadcast}
            onToggleAllBroadcast={handleToggleAllBroadcast}
            selectedCount={selectedIds.length}
          />
        </TechPanel>
      </div>
    </div>
  );
};

