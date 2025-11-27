import React from 'react';
import { useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import DataAnalysisPanel from './DataAnalysisPanel';

/**
 * 全局数据分析面板包装组件
 * 在App.tsx中全局渲染，避免被父容器的overflow-hidden限制
 */
export const GlobalDataAnalysisPanel: React.FC = () => {
  const { appendMessage, isLoading } = useCopilotChat();

  const handleSendMessage = async (message: string) => {
    await appendMessage(new TextMessage({
      role: Role.User,
      content: message,
    }));
  };

  return (
    <DataAnalysisPanel 
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
    />
  );
};

