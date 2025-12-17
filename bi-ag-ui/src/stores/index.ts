import { createPinia } from 'pinia';
import { createPersistedState } from 'pinia-plugin-persistedstate';

const pinia = createPinia();

// 配置持久化插件，使用 localStorage
pinia.use(
  createPersistedState({
    storage: localStorage,
  })
);

export default pinia;

