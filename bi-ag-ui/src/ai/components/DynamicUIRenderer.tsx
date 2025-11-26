import React, { useState, useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import * as echarts from 'echarts/core';
import {
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  RadarChart,
} from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  ToolboxComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册必要的 ECharts 组件
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  ToolboxComponent,
  CanvasRenderer,
]);

interface DynamicUIRendererProps {
  /**
   * AI生成的配置对象
   */
  config: {
    type: 'chart' | 'table' | 'custom' | 'text' | 'markdown' | 'html';
    chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'radar';
    title?: string;
    description?: string;
    data: any;
    options?: any; // ECharts options
    customCode?: string; // 自定义React组件代码
    content?: string; // 用于text/markdown/html类型
  };
  className?: string;
}

/**
 * 动态UI渲染器
 * 根据AI生成的配置渲染图表或自定义组件
 */
export const DynamicUIRenderer: React.FC<DynamicUIRendererProps> = ({ 
  config, 
  className = '' 
}) => {
  // Debug: 记录收到的config
  console.log('[DynamicUIRenderer] Received config:', {
    type: config.type,
    chartType: config.chartType,
    title: config.title,
    dataKeys: config.data ? Object.keys(config.data) : [],
    data: config.data
  });

  // 生成ECharts配置
  const { chartOption, error: configError } = useMemo(() => {
    if (config.type !== 'chart') return { chartOption: null, error: null };

    try {
      // 如果AI直接提供了完整的options，使用它
      if (config.options) {
        return { chartOption: config.options, error: null };
      }

      // 否则，根据chartType和data自动生成配置
      const baseOption = {
        backgroundColor: 'transparent',
        title: {
          text: config.title || '数据分析',
          left: 'center',
          textStyle: {
            color: '#34D399',
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          borderColor: '#22D3EE',
          borderWidth: 1,
          textStyle: {
            color: '#F3F4F6',
          },
        },
        legend: {
          top: 'bottom',
          textStyle: {
            color: '#9CA3AF',
          },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          top: '15%',
          containLabel: true,
        },
      };

      const { chartType, data } = config;

      let option;
      switch (chartType) {
        case 'line':
          option = {
            ...baseOption,
            xAxis: {
              type: 'category',
              data: data.xAxis || data.categories || [],
              axisLine: { lineStyle: { color: '#374151' } },
              axisLabel: { color: '#9CA3AF' },
            },
            yAxis: {
              type: 'value',
              axisLine: { lineStyle: { color: '#374151' } },
              axisLabel: { color: '#9CA3AF' },
              splitLine: { lineStyle: { color: '#1F2937' } },
            },
            series: Array.isArray(data.series)
              ? data.series.map((s: any) => ({
                  ...s,
                  type: 'line',
                  smooth: true,
                  symbolSize: 8,
                  lineStyle: { width: 3 },
                }))
              : [
                  {
                    type: 'line',
                    data: data.values || data.data || [],
                    smooth: true,
                    symbolSize: 8,
                    lineStyle: { width: 3, color: '#22D3EE' },
                    itemStyle: { color: '#22D3EE' },
                    areaStyle: {
                      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(34, 211, 238, 0.3)' },
                        { offset: 1, color: 'rgba(34, 211, 238, 0.05)' },
                      ]),
                    },
                  },
                ],
          };
          break;

        case 'bar':
          option = {
            ...baseOption,
            xAxis: {
              type: 'category',
              data: data.xAxis || data.categories || [],
              axisLine: { lineStyle: { color: '#374151' } },
              axisLabel: { color: '#9CA3AF' },
            },
            yAxis: {
              type: 'value',
              axisLine: { lineStyle: { color: '#374151' } },
              axisLabel: { color: '#9CA3AF' },
              splitLine: { lineStyle: { color: '#1F2937' } },
            },
            series: Array.isArray(data.series)
              ? data.series.map((s: any) => ({ ...s, type: 'bar' }))
              : [
                  {
                    type: 'bar',
                    data: data.values || data.data || [],
                    itemStyle: {
                      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#34D399' },
                        { offset: 1, color: '#059669' },
                      ]),
                      borderRadius: [4, 4, 0, 0],
                    },
                    emphasis: {
                      itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                          { offset: 0, color: '#10B981' },
                          { offset: 1, color: '#047857' },
                        ]),
                      },
                    },
                  },
                ],
          };
          break;

        case 'pie':
          option = {
            ...baseOption,
            tooltip: {
              trigger: 'item',
              formatter: '{a} <br/>{b}: {c} ({d}%)',
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              borderColor: '#22D3EE',
              borderWidth: 1,
              textStyle: { color: '#F3F4F6' },
            },
            series: [
              {
                name: config.title || '数据分布',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '50%'],
                // 支持多种数据字段名
                data: data.data || data.series || data.values || [],
                emphasis: {
                  itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)',
                  },
                },
                label: {
                  color: '#9CA3AF',
                  formatter: '{b}: {c} ({d}%)',
                },
                labelLine: {
                  lineStyle: { color: '#374151' },
                },
              },
            ],
          };
          break;

        case 'scatter':
          option = {
            ...baseOption,
            xAxis: {
              type: 'value',
              axisLine: { lineStyle: { color: '#374151' } },
              axisLabel: { color: '#9CA3AF' },
              splitLine: { lineStyle: { color: '#1F2937' } },
            },
            yAxis: {
              type: 'value',
              axisLine: { lineStyle: { color: '#374151' } },
              axisLabel: { color: '#9CA3AF' },
              splitLine: { lineStyle: { color: '#1F2937' } },
            },
            series: [
              {
                type: 'scatter',
                data: data.data || data.values || [],
                symbolSize: 10,
                itemStyle: { color: '#22D3EE' },
              },
            ],
          };
          break;

        case 'radar':
          option = {
            ...baseOption,
            radar: {
              indicator: data.indicator || [],
              axisLine: { lineStyle: { color: '#374151' } },
              splitLine: { lineStyle: { color: '#374151' } },
              splitArea: {
                areaStyle: {
                  color: ['rgba(34, 211, 238, 0.05)', 'rgba(34, 211, 238, 0.1)'],
                },
              },
            },
            series: [
              {
                type: 'radar',
                data: data.data || data.values || [],
                itemStyle: { color: '#22D3EE' },
                areaStyle: { color: 'rgba(34, 211, 238, 0.3)' },
              },
            ],
          };
          break;

        default:
          option = baseOption;
      }
      
      return { chartOption: option, error: null };
    } catch (err) {
      console.error('[DynamicUIRenderer] Error generating chart options:', err);
      return { chartOption: null, error: '图表配置生成失败' };
    }
  }, [config]);

  const error = configError;

  // Debug: 添加数据验证日志
  useEffect(() => {
    if (config.type === 'chart') {
      console.log('[DynamicUIRenderer] Chart option generated:', {
        hasOption: !!chartOption,
        chartType: config.chartType,
        dataKeys: config.data ? Object.keys(config.data) : [],
        dataValues: config.data
      });
    }
  }, [chartOption, config]);

  // 渲染表格
  const renderTable = () => {
    const { data } = config;
    
    if (!data || !data.columns || !data.rows) {
      return <div className="text-red-400">表格数据格式错误</div>;
    }

    return (
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-tech-dark border-b border-tech-cyan/30">
              {data.columns.map((col: string, idx: number) => (
                <th key={idx} className="px-4 py-3 text-left text-tech-cyan font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row: any[], rowIdx: number) => (
              <tr 
                key={rowIdx} 
                className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors"
              >
                {row.map((cell: any, cellIdx: number) => (
                  <td key={cellIdx} className="px-4 py-3 text-gray-300">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 渲染自定义组件（暂不支持，预留接口）
  const renderCustom = () => {
    return (
      <div className="text-yellow-400 text-center py-8">
        自定义组件渲染功能开发中...
      </div>
    );
  };

  if (error) {
    console.error('[DynamicUIRenderer] Rendering error:', error);
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
        <div className="font-semibold mb-2">渲染错误</div>
        <div className="text-sm">{error}</div>
      </div>
    );
  }

  // 数据为空时显示提示
  if (config.type === 'chart' && !chartOption) {
    console.warn('[DynamicUIRenderer] No chart option generated');
    return (
      <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 text-yellow-400">
        <div className="font-semibold mb-2">数据为空</div>
        <div className="text-sm">图表数据未正确加载，请检查数据源</div>
      </div>
    );
  }

  return (
    <div className={`dynamic-ui-renderer ${className}`}>
      {config.description && (
        <div className="text-gray-400 text-sm mb-4 px-2">
          {config.description}
        </div>
      )}
      
      {config.type === 'chart' && chartOption && (
        <ReactECharts
          option={chartOption}
          style={{ height: '400px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          theme="dark"
        />
      )}

      {config.type === 'table' && renderTable()}

      {config.type === 'custom' && renderCustom()}
      
      {/* 纯文本渲染 */}
      {config.type === 'text' && config.content && (
        <div className="prose prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
            {config.content}
          </div>
        </div>
      )}
      
      {/* Markdown渲染 */}
      {config.type === 'markdown' && config.content && (
        <div className="prose prose-invert max-w-none prose-headings:text-tech-cyan prose-a:text-blue-400 prose-code:text-green-400 prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          >
            {config.content}
          </ReactMarkdown>
        </div>
      )}
      
      {/* HTML渲染 */}
      {config.type === 'html' && config.content && (
        <div 
          className="html-content prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: config.content }}
        />
      )}
    </div>
  );
};

export default DynamicUIRenderer;

