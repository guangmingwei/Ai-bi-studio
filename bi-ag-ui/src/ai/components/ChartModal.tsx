import React from 'react';
import { X, Maximize2, Minimize2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DynamicUIRenderer from './DynamicUIRenderer';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: any;
  title?: string;
}

/**
 * 图表展示弹窗
 * 用于显示AI生成的动态图表和数据分析
 */
export const ChartModal: React.FC<ChartModalProps> = ({
  isOpen,
  onClose,
  config,
  title = '数据分析',
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Debug: 监控modal状态
  React.useEffect(() => {
    console.log('[ChartModal] Props changed:', {
      isOpen,
      hasConfig: !!config,
      configType: config?.type,
      configChartType: config?.chartType,
      configTitle: config?.title,
      configDataKeys: config?.data ? Object.keys(config.data) : [],
      configData: config?.data
    });
  }, [isOpen, config]);

  const handleDownload = () => {
    // TODO: 实现图表下载功能
    console.log('[ChartModal] Download chart');
  };

  console.log('[ChartModal] Rendering with isOpen:', isOpen);

  if (!isOpen) {
    console.log('[ChartModal] Not rendering because isOpen is false');
    return null;
  }
  
  if (!config) {
    console.log('[ChartModal] Not rendering because config is null');
    return null;
  }
  
  console.log('[ChartModal] Rendering modal with config:', config);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* 弹窗内容 */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`relative bg-gradient-to-br from-tech-dark via-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-tech-cyan/30 ${
              isFullscreen ? 'w-[95vw] h-[95vh]' : 'w-[90vw] max-w-6xl h-[80vh]'
            }`}
            style={{
              boxShadow: '0 0 40px rgba(34, 211, 238, 0.2)',
            }}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-tech-cyan/20">
              <div>
                <h2 className="text-xl font-bold text-tech-cyan flex items-center gap-2">
                  <span className="w-2 h-2 bg-tech-cyan rounded-full animate-pulse" />
                  {title}
                </h2>
                {config.description && (
                  <p className="text-sm text-gray-400 mt-1">{config.description}</p>
                )}
              </div>

              {/* 工具栏 */}
              <div className="flex items-center gap-2">
                {/* 下载按钮 */}
                <button
                  onClick={handleDownload}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-tech-cyan"
                  title="下载图表"
                >
                  <Download className="w-5 h-5" />
                </button>

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
                  onClick={onClose}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                  title="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="p-6 overflow-auto" style={{ height: 'calc(100% - 80px)' }}>
              <DynamicUIRenderer config={config} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ChartModal;

