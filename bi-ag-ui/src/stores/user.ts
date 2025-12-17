import { defineStore } from "pinia";

export interface UserInfo {
  id?: string | number;
  username?: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

interface UserState {
  userInfo: UserInfo;
  isLoggedIn: boolean;
}

// @ts-ignore - pinia-plugin-persistedstate 类型定义问题
export const useUserStore = defineStore("user", {
  state: (): UserState => ({
    userInfo: {},
    isLoggedIn: false,
  }),

  getters: {
    hasToken: (): boolean => {
      try {
        return !!localStorage.getItem('token');
      } catch {
        return false;
      }
    },
    userId: (state): string | number | undefined => state.userInfo?.id,
  },

  actions: {
    /**
     * 设置 token（直接存储到 localStorage）
     */
    setToken(newToken: string) {
      try {
        if (newToken) {
          localStorage.setItem('token', newToken);
          (this as any).isLoggedIn = true;
        } else {
          localStorage.removeItem('token');
          (this as any).isLoggedIn = false;
        }
      } catch (error) {
        console.error('[UserStore] Failed to set token:', error);
      }
    },

    /**
     * 获取 token
     */
    getToken(): string {
      try {
        return localStorage.getItem('token') || '';
      } catch {
        return '';
      }
    },

    /**
     * 设置用户信息
     */
    setUserInfo(info: UserInfo) {
      (this as any).userInfo = info;
    },

    /**
     * 登录
     */
    login(newToken: string, info?: UserInfo) {
      (this as any).setToken(newToken);
      if (info) {
        (this as any).setUserInfo(info);
      }
    },

    /**
     * 登出
     */
    logout() {
      try {
        localStorage.removeItem('token');
      } catch (error) {
        console.error('[UserStore] Failed to remove token:', error);
      }
      (this as any).userInfo = {};
      (this as any).isLoggedIn = false;
    },

    /**
     * 处理登录过期
     */
    handleLoginExpired() {
      (this as any).logout();
      // 可以在这里添加跳转到登录页的逻辑
      // 例如：window.location.href = '/login';
    },

    /**
     * 更新用户信息
     */
    updateUserInfo(info: Partial<UserInfo>) {
      (this as any).userInfo = { ...(this as any).userInfo, ...info };
    },
  },

  persist: {
    key: "user",
    paths: ["userInfo", "isLoggedIn"],
  },
});
