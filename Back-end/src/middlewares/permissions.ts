export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user;

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Sem permissão" });
    }

    next();
  };
}
