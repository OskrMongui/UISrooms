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

export const isAdmin = () => {
  const user = getUserFromToken();
  return user && user.rol && user.rol.nombre && user.rol.nombre.toLowerCase() === 'admin';
};
