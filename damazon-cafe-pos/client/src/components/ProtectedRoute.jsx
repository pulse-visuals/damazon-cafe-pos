import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ roles, children }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream dark:bg-canopy-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-canopy-300 border-t-canopy-600" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/pos" replace />;
  return children;
}
