export enum UserRole {
  ADMIN = 'admin',
  SUPERVISOR = 'supervisor',
  EMPLOYEE = 'employee',
}

export interface User {
  id: number;
  username: string;
  password: string;
  employee_code?: string;
  role: UserRole;
  full_name: string;
  email?: string;
  is_active: boolean;
  created_at: Date;
  last_login?: Date;
}

export interface UserResponse {
  id: number;
  username: string;
  employee_code?: string;
  role: UserRole;
  full_name: string;
  email?: string;
  is_active: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: UserResponse;
  token: string;
  message: string;
}

export interface AuthRequest extends Express.Request {
  user?: UserResponse;
}

