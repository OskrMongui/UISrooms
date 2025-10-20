import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserRole, isAdmin } from '../utils/auth';

const ProtectedRoute = ({ children, admin = false, roles = [] }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;

  const userRole = getUserRole();

  if (admin && !isAdmin()) {
    return <Navigate to="/" />;
  }

  if (roles.length > 0) {
    const allowed = roles.map((role) => role.toLowerCase());
    if (!allowed.includes((userRole || '').toLowerCase()) && !isAdmin()) {
      return <Navigate to="/" />;
    }
  }

  return children;
};

export default ProtectedRoute;
