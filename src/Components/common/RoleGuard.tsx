// @ts-nocheck
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { RootState } from '@/store';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
}

const RoleGuard = ({ children, allowedRoles, fallbackPath = '/paper' }: RoleGuardProps) => {
  const { user } = useSelector((state: RootState) => state.user);

  // If user role is not in allowed roles, redirect to fallback path
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
