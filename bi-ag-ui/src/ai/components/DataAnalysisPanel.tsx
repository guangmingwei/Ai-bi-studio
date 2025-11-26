import React, { useState, useRef } from 'react';
import { X, Maximize2, Minimize2, Trash2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store';
import DynamicUIRenderer from './DynamicUIRenderer';

interface DataAnalysisPanelProps {
  onSendMessage?: (message: string) => void;
  isLoading?: boolean;
}

/**
 * 数据分析面板 - 支持多图表展示和持续对话
 */
export const DataAnalysisPanel: React.FC<DataAnalysisPanelProps> = ({ 
  onSendMessage,
  isLoading = false 
}) => {
  const { chartConfigs, isChartModalOpen, setIsChartModalOpen, clearChartConfigs } = useAppStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    
    // 调用父组件传入的发送消息函数
    if (onSendMessage) {
      onSendMessage(inputValue.trim());
    }
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    setIsChartModalOpen(false);
  };

  if (!isChartModalOpen) return null;

  return (
    <AnimatePresence>
      {isChartModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* 面板内容 */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`relative bg-gradient-to-br from-tech-dark via-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-tech-cyan/30 flex flex-col ${
              isFullscreen ? 'w-[98vw] h-[98vh]' : 'w-[90vw] max-w-7xl h-[85vh]'
            }`}
            style={{
              boxShadow: '0 0 40px rgba(34, 211, 238, 0.2)',
            }}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-tech-cyan/20 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-tech-cyan flex items-center gap-2">
                  <span className="w-2 h-2 bg-tech-cyan rounded-full animate-pulse" />
                  数据分析工作台
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  已添加 {chartConfigs.length} 个图表
                </p>
              </div>

              {/* 工具栏 */}
              <div className="flex items-center gap-2">
                {/* 清空按钮 */}
                {chartConfigs.length > 0 && (
                  <button
                    onClick={clearChartConfigs}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                    title="清空所有图表"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                {/* 全屏切换 */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-tech-cyan"
                  title={isFullscreen ? '退出全屏' : '全屏显示'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>

                {/* 关闭按钮 */}
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                  title="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 图表展示区域 - 可滚动 */}
            <div className="flex-1 overflow-auto p-6">
              {chartConfigs.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-500 text-lg mb-2">📊</div>
                    <p className="text-gray-400">暂无图表</p>
                    <p className="text-gray-500 text-sm mt-2">
                      在下方输入框中告诉AI您想要分析的数据
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {chartConfigs.map((config) => (
                    <motion.div
                      key={config.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-tech-cyan/30 transition-colors"
                    >
                      <DynamicUIRenderer config={config} />
                    </motion.div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 对话输入区域 */}
            <div className="border-t border-tech-cyan/20 p-4 flex-shrink-0 bg-gray-900/50">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="继续与AI对话，生成更多图表分析..."
                  disabled={isLoading}
                  className="flex-1 bg-gray-800/80 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-tech-cyan/50 focus:ring-1 focus:ring-tech-cyan/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-6 py-3 bg-tech-cyan hover:bg-tech-cyan/80 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-tech-cyan/20"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      发送
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 提示：您可以要求AI显示不同时间范围、不同类型的图表
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DataAnalysisPanel;

