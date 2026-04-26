import { Navigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";

export function AuthGuard({ children }: { children: JSX.Element }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}