import { useAuth, UserRole } from "@/contexts/AuthContext";

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
}

export default function RoleGuard({ roles, children }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) return null;

  if (!roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}