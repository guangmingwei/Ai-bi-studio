import { get, post, put, upload } from "../../utils/request";

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userInfo?: any;
}

export interface UserInfo {
  id: string | number;
  username: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

/**
 * 用户登录
 */
export const login = (data: LoginParams) => {
  return post<LoginResponse>("/auth/login", data);
};

/**
 * 获取用户信息
 */
export const getUserInfo = (params?: { id?: string | number }) => {
  return get<UserInfo>("/user/info", params);
};

/**
 * 获取不确定类型的数据（使用 any）
 * 适用于：接口返回结构完全未知
 */
export const getUnknownData = (url: string, params?: any) => {
  return get<any>(url, params);
};

/**
 * 更新用户信息
 */
export const updateUserInfo = (data: Partial<UserInfo>) => {
  return put<UserInfo>("/user/update", data);
};

/**
 * 上传头像
 */
export const uploadAvatar = (
  file: File | Blob,
  onProgress?: (progress: number) => void
) => {
  return upload<{ url: string }>("/user/avatar", file, onProgress);
};

/**
 * 修改密码
 */
export const changePassword = (data: {
  oldPassword: string;
  newPassword: string;
}) => {
  return post("/user/change-password", data);
};

export default {
  login,
  getUserInfo,
  updateUserInfo,
  uploadAvatar,
  changePassword,
};
