import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Speaker, Folder, Search, CheckSquare, Square } from 'lucide-react';

interface TreeNode {
  id: string;
  label: string;
  type: 'folder' | 'device';
  children?: TreeNode[];
  status?: 'online' | 'offline' | 'error';
}

const treeData: TreeNode[] = [
  {
    id: 'area-1',
    label: '一号厂区',
    type: 'folder',
    children: [
      { id: 'spk-1', label: '北门入口广播', type: 'device', status: 'online' },
      { id: 'spk-2', label: '物流通道广播', type: 'device', status: 'online' },
      { id: 'spk-3', label: '原料仓库广播', type: 'device', status: 'offline' },
    ]
  },
  {
    id: 'area-2',
    label: '二号厂区',
    type: 'folder',
    children: [
      { id: 'spk-4', label: '生产车间 A 广播', type: 'device', status: 'online' },
      { id: 'spk-5', label: '生产车间 B 广播', type: 'device', status: 'online' },
    ]
  },
  {
    id: 'area-3',
    label: '公共区域',
    type: 'folder',
    children: [
      { id: 'spk-6', label: '员工食堂广播', type: 'device', status: 'online' },
      { id: 'spk-7', label: '地下车库广播', type: 'device', status: 'error' },
      { id: 'spk-8', label: '外围围墙广播', type: 'device', status: 'online' },
    ]
  }
];

interface DeviceTreeProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  selectAllTrigger?: number; // 用于触发全选
}

const getAllDeviceIds = (nodes: TreeNode[]): string[] => {
  let ids: string[] = [];
  nodes.forEach(node => {
    if (node.type === 'device') {
      ids.push(node.id);
    }
    if (node.children) {
      ids = [...ids, ...getAllDeviceIds(node.children)];
    }
  });
  return ids;
};

const TreeNodeItem = ({ 
  node, 
  level = 0, 
  selectedIds, 
  onToggle 
}: { 
  node: TreeNode, 
  level?: number, 
  selectedIds: string[], 
  onToggle: (id: string, isFolder: boolean, childIds?: string[]) => void 
}) => {
  const [expanded, setExpanded] = useState(true);
  
  // 计算当前节点（如果是folder）是否全选或部分选择
  const getFolderStatus = () => {
    if (node.type !== 'folder' || !node.children) return 'none';
    const childIds = getAllDeviceIds(node.children);
    const selectedChildCount = childIds.filter(id => selectedIds.includes(id)).length;
    
    if (selectedChildCount === 0) return 'none';
    if (selectedChildCount === childIds.length) return 'all';
    return 'partial';
  };

  const isSelected = node.type === 'device' ? selectedIds.includes(node.id) : false;
  const folderStatus = getFolderStatus();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      setExpanded(!expanded);
    }
  };

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    const childIds = node.children ? getAllDeviceIds(node.children) : [];
    onToggle(node.id, node.type === 'folder', childIds);
  };

  return (
    <div>
      <div 
        className={`flex items-center gap-2 py-2 px-2 cursor-pointer hover:bg-white/5 rounded transition-colors ${level > 0 ? 'ml-4' : ''}`}
        onClick={handleClick}
      >
        {node.type === 'folder' && (
          <span className="text-slate-500 shrink-0">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        
        {/* Checkbox */}
        <div onClick={handleCheck} className="cursor-pointer text-slate-400 hover:text-blue-400">
          {node.type === 'folder' ? (
             folderStatus === 'all' ? <CheckSquare size={16} className="text-blue-500" /> :
             folderStatus === 'partial' ? <div className="w-4 h-4 border border-blue-500 rounded flex items-center justify-center bg-blue-500/20"><div className="w-2 h-2 bg-blue-500 rounded-sm" /></div> :
             <Square size={16} />
          ) : (
             isSelected ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} />
          )}
        </div>

        {node.type === 'folder' ? (
          <Folder size={16} className="text-blue-400 shrink-0" />
        ) : (
          <Speaker size={16} className={`shrink-0 ${
            node.status === 'online' ? 'text-emerald-400' : 
            node.status === 'offline' ? 'text-slate-500' : 'text-red-400'
          }`} />
        )}
        
        <span className={`text-sm truncate ${node.type === 'folder' ? 'font-medium text-slate-200' : 'text-slate-400'}`}>
          {node.label}
        </span>
        
        {node.status && node.status !== 'online' && (
          <span className={`ml-auto text-[10px] px-1.5 rounded border shrink-0 ${
            node.status === 'offline' ? 'border-slate-600 text-slate-500' : 'border-red-500/50 text-red-400'
          }`}>
            {node.status.toUpperCase()}
          </span>
        )}
      </div>
      
      {expanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNodeItem 
              key={child.id} 
              node={child} 
              level={level + 1} 
              selectedIds={selectedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DeviceTree: React.FC<DeviceTreeProps> = ({ selectedIds, onSelectionChange, selectAllTrigger }) => {
  // 处理选择切换
  const handleToggle = (id: string, isFolder: boolean, childIds: string[] = []) => {
    if (isFolder) {
      // 如果是文件夹，检查当前是否全选
      const allSelected = childIds.every(cid => selectedIds.includes(cid));
      if (allSelected) {
        // 取消全选
        onSelectionChange(selectedIds.filter(sid => !childIds.includes(sid)));
      } else {
        // 全选
        const newIds = Array.from(new Set([...selectedIds, ...childIds]));
        onSelectionChange(newIds);
      }
    } else {
      // 单个设备
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter(sid => sid !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    }
  };

  // 监听外部全选触发
  useEffect(() => {
    if (selectAllTrigger && selectAllTrigger > 0) {
      const allIds = getAllDeviceIds(treeData);
      onSelectionChange(allIds);
    }
  }, [selectAllTrigger]);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input 
          type="text" 
          placeholder="搜索广播设备..." 
          className="w-full bg-slate-900/50 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
        />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {treeData.map(node => (
          <TreeNodeItem 
            key={node.id} 
            node={node} 
            selectedIds={selectedIds}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
};

