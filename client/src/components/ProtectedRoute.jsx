import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_ROUTE_BY_ROLE } from "../roles";

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={DEFAULT_ROUTE_BY_ROLE[user.role] || "/login"} replace />;
  }

  return <Outlet />;
}
