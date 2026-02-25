import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('owner' | 'manager' | 'cashier')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, userRole, needsBusinessSetup, businessInfo, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isSuperAdmin) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Only redirect to business-setup if:
  // 1. needsBusinessSetup is explicitly true (user selected "owner" role but has no business)
  // 2. businessInfo is null (no business found)
  // 3. We're not already on the business-setup page
  if (needsBusinessSetup && !businessInfo && location.pathname !== '/business-setup') {
    return <Navigate to="/business-setup" replace />;
  }

  // If roles are specified, check if user has permission
  if (allowedRoles && allowedRoles.length > 0 && userRole) {
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
