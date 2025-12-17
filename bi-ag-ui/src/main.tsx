import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CopilotKit } from "@copilotkit/react-core";
import './stores'; // 初始化 Pinia
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CopilotKit runtimeUrl="http://localhost:4000/copilotkit">
      <App />
    </CopilotKit>
  </StrictMode>,
)
