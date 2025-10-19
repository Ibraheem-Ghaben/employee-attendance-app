import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserResponse, UserRole } from '../types/user';

export interface AuthRequest extends Request {
  user?: UserResponse;
}

/**
 * Middleware to verify JWT token
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'default_secret';
    
    const decoded = jwt.verify(token, jwtSecret) as UserResponse;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is accessing their own data or is admin/supervisor
 */
export const authorizeOwnDataOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated.',
    });
    return;
  }

  const requestedEmployeeCode = req.params.employeeCode || req.query.employee_code;
  
  // Admin and Supervisor can access any data
  if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERVISOR) {
    next();
    return;
  }

  // Employee can only access their own data
  if (req.user.employee_code === requestedEmployeeCode) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Access denied. You can only access your own data.',
  });
};

