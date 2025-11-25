import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Camera, Folder, Search } from 'lucide-react';
import { TechPanel } from '../ui/TechPanel';

interface TreeNode {
  id: string;
  label: string;
  type: 'folder' | 'camera';
  children?: TreeNode[];
  status?: 'online' | 'offline' | 'error';
}

const treeData: TreeNode[] = [
  {
    id: 'area-1',
    label: '一号厂区',
    type: 'folder',
    children: [
      { id: 'cam-1', label: '北门入口 CAM-01', type: 'camera', status: 'online' },
      { id: 'cam-2', label: '物流通道 CAM-02', type: 'camera', status: 'online' },
      { id: 'cam-3', label: '原料仓库 CAM-03', type: 'camera', status: 'offline' },
    ]
  },
  {
    id: 'area-2',
    label: '二号厂区',
    type: 'folder',
    children: [
      { id: 'cam-4', label: '生产车间 A', type: 'camera', status: 'online' },
      { id: 'cam-5', label: '生产车间 B', type: 'camera', status: 'online' },
    ]
  },
  {
    id: 'area-3',
    label: '公共区域',
    type: 'folder',
    children: [
      { id: 'cam-6', label: '员工食堂', type: 'camera', status: 'online' },
      { id: 'cam-7', label: '地下车库', type: 'camera', status: 'error' },
      { id: 'cam-8', label: '外围围墙', type: 'camera', status: 'online' },
    ]
  }
];

const TreeNodeItem = ({ node, level = 0 }: { node: TreeNode, level?: number }) => {
  const [expanded, setExpanded] = useState(true);
  
  const handleClick = () => {
    if (node.type === 'folder') {
      setExpanded(!expanded);
    }
  };

  return (
    <div>
      <div 
        className={`flex items-center gap-2 py-2 px-2 cursor-pointer hover:bg-white/5 rounded transition-colors ${level > 0 ? 'ml-4' : ''}`}
        onClick={handleClick}
      >
        {node.type === 'folder' && (
          <span className="text-slate-500">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        
        {node.type === 'folder' ? (
          <Folder size={16} className="text-blue-400" />
        ) : (
          <Camera size={16} className={
            node.status === 'online' ? 'text-emerald-400' : 
            node.status === 'offline' ? 'text-slate-500' : 'text-red-400'
          } />
        )}
        
        <span className={`text-sm ${node.type === 'folder' ? 'font-medium text-slate-200' : 'text-slate-400'}`}>
          {node.label}
        </span>
        
        {node.status && node.status !== 'online' && (
          <span className={`ml-auto text-[10px] px-1.5 rounded border ${
            node.status === 'offline' ? 'border-slate-600 text-slate-500' : 'border-red-500/50 text-red-400'
          }`}>
            {node.status.toUpperCase()}
          </span>
        )}
      </div>
      
      {expanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNodeItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const CameraTree: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input 
          type="text" 
          placeholder="搜索摄像头..." 
          className="w-full bg-slate-900/50 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
        />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {treeData.map(node => (
          <TreeNodeItem key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
};

