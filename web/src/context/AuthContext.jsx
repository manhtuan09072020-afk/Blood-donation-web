import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export const ROLES = {
  QUAN_TRI: 'QuanTri',
  NHAN_VIEN_TIEP_NHAN: 'NhanVienTiepNhan',
  NHAN_VIEN_SANG_LOC: 'NhanVienSangLoc',
  NHAN_VIEN_KHO: 'NhanVienKho',
  NGUOI_HIEN_MAU: 'NguoiHienMau'
};

export const STAFF_ROLES = [ROLES.QUAN_TRI, ROLES.NHAN_VIEN_TIEP_NHAN, ROLES.NHAN_VIEN_SANG_LOC, ROLES.NHAN_VIEN_KHO];

export const ROLE_LABELS = {
  QuanTri: 'Quản trị viên',
  NhanVienTiepNhan: 'Nhân viên tiếp nhận',
  NhanVienSangLoc: 'Nhân viên sàng lọc',
  NhanVienKho: 'Nhân viên quản lý kho',
  NguoiHienMau: 'Người hiến máu'
};

export const ROLE_COLORS = {
  QuanTri: 'magenta',
  NhanVienTiepNhan: 'blue',
  NhanVienSangLoc: 'cyan',
  NhanVienKho: 'gold',
  NguoiHienMau: 'red'
};

function readStoredUser() {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback(async (username, password) => {
    const res = await authApi.login({ username, password });
    localStorage.setItem('token', res.token);
    const userData = { username: res.username, role: res.role, hoTen: res.hoTen, profileId: res.profileId };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    updateUser,
    isStaff: !!user && STAFF_ROLES.includes(user.role),
    isDonor: user?.role === ROLES.NGUOI_HIEN_MAU,
    hasRole: (...roles) => !!user && roles.includes(user.role)
  }), [user, login, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return ctx;
}

// Trang chủ sau đăng nhập theo vai trò
export function homePathFor(role) {
  if (role === ROLES.NGUOI_HIEN_MAU) return '/me';
  if (role === ROLES.NHAN_VIEN_SANG_LOC) return '/admin/screening';
  if (role === ROLES.NHAN_VIEN_KHO) return '/admin/inventory';
  return '/admin';
}
