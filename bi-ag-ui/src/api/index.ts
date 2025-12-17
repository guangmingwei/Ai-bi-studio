// 导出各模块 API
export { default as userApi } from './apis/user';

// 统一导出
export default {
  userApi: () => import('./apis/user'),
};

