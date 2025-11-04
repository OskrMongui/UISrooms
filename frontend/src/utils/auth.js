import { jwtDecode } from 'jwt-decode';

export const getUserFromToken = () => {
  const user = localStorage.getItem('user');
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const getUserRole = () => {
  const user = getUserFromToken();
  const roleName = user?.rol?.nombre;
  return roleName ? roleName.toLowerCase() : null;
};

export const hasRole = (roleName) => {
  const current = getUserRole();
  if (!roleName) return false;
  return current === roleName.toLowerCase();
};

export const hasAnyRole = (roles = []) => {
  const current = getUserRole();
  return !!current && roles.map((r) => r.toLowerCase()).includes(current);
};

export const isAdmin = () => hasRole('admin');
export const isSecretaria = () => hasRole('secretaria');
export const isLaboratorista = () => hasRole('laboratorista');
export const isConserje = () => hasRole('conserje');
export const canApproveReservations = () => hasAnyRole(['admin', 'secretaria', 'laboratorista']);
