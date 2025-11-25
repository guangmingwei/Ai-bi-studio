import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, Calendar, MapPin, Clock, Eye, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock details
const patrolDetails = {
  id: 'PATROL-20231125-01',
  name: '全厂积水排查',
  status: 'completed',
  startTime: '2023-11-25 10:42',
  duration: '45min',
  area: '全厂区',
  totalPoints: 24,
  riskPoints: 2,
  records: Array.from({ length: 8 }, (_, i) => ({
    id: i,
    cameraName: i % 3 === 0 ? '北门入口 CAM-01' : i % 3 === 1 ? '地下车库 CAM-07' : '原料仓 CAM-03',
    time: `10:${42 + i}`,
    status: i === 1 ? 'risk' : 'normal', // 只有第二个有隐患
    riskType: i === 1 ? '积水检测' : undefined,
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop'
  }))
};

interface PatrolDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: number;
}

export const PatrolDetailModal: React.FC<PatrolDetailModalProps> = ({ isOpen, onClose, taskId }) => {
  const [selectedRecord, setSelectedRecord] = useState(patrolDetails.records[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-6xl h-[85vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-slate-800/50 flex justify-between items-start">
           <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                 {patrolDetails.name}
                 <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs border border-emerald-500/30 font-medium">已完成</span>
              </h2>
              <div className="flex gap-6 mt-2 text-sm text-slate-400">
                 <span className="flex items-center gap-2"><Clock size={14} /> {patrolDetails.startTime} (耗时 {patrolDetails.duration})</span>
                 <span className="flex items-center gap-2"><MapPin size={14} /> {patrolDetails.area}</span>
                 <span className="flex items-center gap-2 text-blue-400"><Eye size={14} /> 已检查 {patrolDetails.totalPoints} 个点位</span>
                 <span className="flex items-center gap-2 text-red-400"><AlertTriangle size={14} /> 发现 {patrolDetails.riskPoints} 处隐患</span>
              </div>
           </div>
           <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
              <X size={24} />
           </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
           {/* Left List */}
           <div className="w-[320px] border-r border-white/10 flex flex-col bg-slate-900/50">
              <div className="p-4 border-b border-white/5 text-sm font-medium text-slate-400">
                 巡查记录明细
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                 {patrolDetails.records.map(record => (
                   <div 
                     key={record.id}
                     onClick={() => setSelectedRecord(record)}
                     className={`p-3 rounded-lg cursor-pointer border transition-all flex items-center gap-3 ${
                       selectedRecord.id === record.id 
                         ? 'bg-blue-600/20 border-blue-500/50' 
                         : 'bg-transparent border-transparent hover:bg-white/5'
                     }`}
                   >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${record.status === 'risk' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                      <div className="flex-1 min-w-0">
                         <div className={`text-sm font-medium truncate ${selectedRecord.id === record.id ? 'text-white' : 'text-slate-300'}`}>
                            {record.cameraName}
                         </div>
                         <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>{record.time}</span>
                            {record.status === 'risk' && <span className="text-red-400">{record.riskType}</span>}
                         </div>
                      </div>
                      <ChevronRight size={14} className={`text-slate-500 ${selectedRecord.id === record.id ? 'opacity-100' : 'opacity-0'}`} />
                   </div>
                 ))}
              </div>
           </div>

           {/* Right Detail */}
           <div className="flex-1 bg-black p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden border border-white/10">
                 <img src={selectedRecord.image} alt="Snapshot" className="w-full h-full object-cover" />
                 
                 {/* AI Overlay */}
                 {selectedRecord.status === 'risk' && (
                    <div className="absolute top-[40%] left-[30%] w-[30%] h-[20%] border-2 border-red-500 shadow-[0_0_20px_red] bg-red-500/10 flex items-start justify-center">
                       <span className="bg-red-500 text-white text-xs px-2 py-1 -mt-6">隐患: {selectedRecord.riskType} (92%)</span>
                    </div>
                 )}
                 
                 {/* Info Overlay */}
                 <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-lg font-bold text-white">{selectedRecord.cameraName}</h3>
                    <p className="text-sm text-slate-300">抓拍时间: {selectedRecord.time}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                    <h4 className="text-sm font-bold text-slate-200 mb-2">AI 分析结果</h4>
                    {selectedRecord.status === 'risk' ? (
                       <div className="flex items-start gap-2 text-sm text-red-400">
                          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                          <div>
                             <p>检测到异常目标：积水面积约 2.5 平方米。</p>
                             <p className="mt-1 text-slate-400">建议处置：通知保洁人员清理。</p>
                          </div>
                       </div>
                    ) : (
                       <div className="flex items-center gap-2 text-sm text-emerald-400">
                          <CheckCircle size={16} />
                          <span>画面正常，未发现预设隐患。</span>
                       </div>
                    )}
                 </div>
                 
                 <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                    <h4 className="text-sm font-bold text-slate-200 mb-2">关联操作</h4>
                    <div className="flex gap-2">
                       {selectedRecord.status === 'risk' ? (
                          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">生成隐患工单</button>
                       ) : (
                          <span className="text-sm text-slate-500">无可用操作</span>
                       )}
                       <button className="px-4 py-2 border border-white/10 hover:bg-white/5 text-white rounded-lg text-sm">查看实时视频</button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

