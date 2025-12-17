import axios from "axios";
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

// 请求配置
const config = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 30000,
  withCredentials: false,
};

// 创建 axios 实例
const service: AxiosInstance = axios.create(config);

// 请求唯一标识集合（解决并发 loading 问题）
// const activeRequests = new Set<symbol>(); // 暂时未使用，保留以备后续扩展

// Token 存储 key
const TOKEN_KEY = "token";

// 获取 token 的辅助函数
const getToken = (): string => {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch (error) {
    console.error("无法获取token", error);
    return "";
  }
};

// 设置 token
export const setToken = (token: string): void => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error("token储存失败", error);
  }
};

// 清除 token
export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("token清除失败", error);
  }
};

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 localStorage 获取 token
    const token = getToken();

    // 添加 token 到请求头
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 设置 Content-Type
    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => {
    console.error("请求错误", error);
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data;

    // 如果要求返回原始响应
    if (response.config.headers?.["X-Return-All"] === "1") {
      return res;
    }

    // 统一处理业务响应格式
    // 假设后端返回格式: { code: 200, data: {}, message: '' }
    if (res.code === 200 || res.code === 0) {
      return res.data !== undefined ? res.data : res;
    }

    // 未登录或 Token 无效
    if (res.code === 401) {
      // 清除 token
      clearToken();
      // 可以在这里添加跳转到登录页的逻辑
      // 例如：window.location.href = '/login';
      return Promise.reject(new Error(res.message || "登录已过期，请重新登录"));
    }

    // 其他业务错误
    const errorMsg = res.message || res.msg || "请求失败，请稍后再试";
    return Promise.reject(new Error(errorMsg));
  },
  (error) => {
    // 处理 HTTP 错误
    let message = "网络连接失败，请检查网络后重试";

    if (error.response) {
      // 服务器返回了错误状态码
      const { status, data } = error.response;

      switch (status) {
        case 400:
          message = data?.message || data?.msg || "请求参数错误";
          break;
        case 401:
          message = "登录已过期，请重新登录";
          // 清除 token
          clearToken();
          // 可以在这里添加跳转到登录页的逻辑
          // 例如：window.location.href = '/login';
          break;
        case 403:
          message = "没有权限访问该资源";
          break;
        case 404:
          message = "请求的资源不存在";
          break;
        case 500:
          message = "服务器内部错误";
          break;
        case 502:
          message = "网关错误";
          break;
        case 503:
          message = "服务不可用";
          break;
        case 504:
          message = "网关超时";
          break;
        default:
          message = data?.message || data?.msg || `请求失败 (${status})`;
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        message = "请求超时，请稍后再试";
      } else if (error.message?.includes("Network Error")) {
        message = "网络异常，请检查网络连接";
      }
    }

    // 开发环境打印详细错误
    if (import.meta.env.DEV) {
      console.error("[Request Error]", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message,
        error,
      });
    }

    return Promise.reject(new Error(message));
  }
);

// 请求方法封装
interface RequestOptions {
  loading?: boolean; // 是否显示 loading
  returnAll?: boolean; // 是否返回完整响应
  headers?: Record<string, string>; // 自定义请求头
}

/**
 * GET 请求
 */
export const get = <T = any>(
  url: string,
  params?: Record<string, any>,
  options?: RequestOptions
): Promise<T> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url,
    params,
  };

  if (options?.returnAll) {
    config.headers = { ...config.headers, "X-Return-All": "1" };
  }

  if (options?.headers) {
    config.headers = { ...config.headers, ...options.headers };
  }

  return service.request<T>(config).then((response) => response.data);
};

/**
 * POST 请求
 */
export const post = <T = any>(
  url: string,
  data?: any,
  options?: RequestOptions
): Promise<T> => {
  const config: AxiosRequestConfig = {
    method: "POST",
    url,
    data,
  };

  if (options?.returnAll) {
    config.headers = { ...config.headers, "X-Return-All": "1" };
  }

  if (options?.headers) {
    config.headers = { ...config.headers, ...options.headers };
  }

  return service.request<T>(config).then((response) => response.data);
};

/**
 * PUT 请求
 */
export const put = <T = any>(
  url: string,
  data?: any,
  options?: RequestOptions
): Promise<T> => {
  const config: AxiosRequestConfig = {
    method: "PUT",
    url,
    data,
  };

  if (options?.returnAll) {
    config.headers = { ...config.headers, "X-Return-All": "1" };
  }

  if (options?.headers) {
    config.headers = { ...config.headers, ...options.headers };
  }

  return service.request<T>(config).then((response) => response.data);
};

/**
 * DELETE 请求
 */
export const del = <T = any>(
  url: string,
  params?: Record<string, any>,
  options?: RequestOptions
): Promise<T> => {
  const config: AxiosRequestConfig = {
    method: "DELETE",
    url,
    params,
  };

  if (options?.returnAll) {
    config.headers = { ...config.headers, "X-Return-All": "1" };
  }

  if (options?.headers) {
    config.headers = { ...config.headers, ...options.headers };
  }

  return service.request<T>(config).then((response) => response.data);
};

/**
 * 文件上传
 */
export const upload = <T = any>(
  url: string,
  file: File | Blob,
  onProgress?: (progress: number) => void,
  options?: RequestOptions
): Promise<T> => {
  const formData = new FormData();
  formData.append("file", file);

  const config: AxiosRequestConfig = {
    method: "POST",
    url,
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
      ...options?.headers,
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(progress);
      }
    },
  };

  if (options?.returnAll) {
    config.headers = { ...config.headers, "X-Return-All": "1" };
  }

  return service.request<T>(config).then((response) => response.data);
};

// 导出 axios 实例（供特殊需求使用）
export default service;
