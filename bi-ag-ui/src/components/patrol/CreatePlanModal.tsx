import React, { useState } from 'react';
import { X, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem && items.length < 5) {
      setItems([...items, newItem]);
      setNewItem('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
           <h3 className="text-lg font-bold text-white">新建即时巡查计划</h3>
           <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
           <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">计划名称</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：全厂积水排查"
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              />
           </div>

           <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">巡查区域范围</label>
              <select 
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              >
                 <option value="">请选择区域...</option>
                 <option value="all">全厂区 (包含所有摄像头)</option>
                 <option value="area-1">一号厂区</option>
                 <option value="area-2">二号厂区</option>
                 <option value="area-3">公共区域</option>
              </select>
           </div>

           <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 flex justify-between">
                 巡查隐患内容 (至多5项)
                 <span className="text-slate-500">{items.length}/5</span>
              </label>
              <div className="flex gap-2">
                 <input 
                   value={newItem}
                   onChange={(e) => setNewItem(e.target.value)}
                   placeholder="输入检查项，如：积水"
                   className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                   disabled={items.length >= 5}
                 />
                 <button 
                   onClick={addItem}
                   disabled={!newItem || items.length >= 5}
                   className="px-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 disabled:opacity-50"
                 >
                    <Plus size={18} />
                 </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                 {items.map((item, idx) => (
                   <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-slate-300">
                      {item}
                      <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="hover:text-red-400">
                         <X size={12} />
                      </button>
                   </span>
                 ))}
                 {items.length === 0 && <span className="text-xs text-slate-600 italic">暂无检查项，将执行通用安全检查</span>}
              </div>
           </div>
        </div>

        <div className="p-5 border-t border-white/10 bg-slate-900/50 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">取消</button>
           <button 
             onClick={() => { onSubmit({ name, area, items }); onClose(); }}
             className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2"
           >
             <CheckCircle size={16} /> 创建并执行
           </button>
        </div>
      </motion.div>
    </div>
  );
};

