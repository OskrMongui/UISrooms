import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAdmin } from '../utils/auth';

const ProtectedRoute = ({ children, admin = false }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  if (admin && !isAdmin()) return <Navigate to="/" />;
  return children;
};

export default ProtectedRoute;
