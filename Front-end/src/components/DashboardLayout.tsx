import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import { api } from "@/lib/api";

interface NavItem { label: string; path: string; icon: React.ElementType; }
interface DashboardLayoutProps { children: ReactNode; navItems: NavItem[]; title: string; }

function UserAvatar({ name, photo }: { name?: string; photo?: string | null }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "U";

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    setFailed(false);
    setSrc(null);

    async function loadPhoto() {
      if (!photo) return;
      if (photo.startsWith("blob:")) { if (active) setSrc(photo); return; }
      if (photo.startsWith("http") && !photo.includes("/documents/")) { if (active) setSrc(photo); return; }
      try {
        const response = await api.get(photo, { responseType: "blob" });
        objectUrl = URL.createObjectURL(response.data);
        if (active) setSrc(objectUrl);
      } catch { if (active) setFailed(true); }
    }

    loadPhoto();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo]);

  if (src && !failed) return <img src={src} alt={name ? `Foto de ${name}` : "Foto de perfil"} onError={() => setFailed(true)} className="w-8 h-8 rounded-full object-cover border border-sidebar-border bg-sidebar-primary/20 shrink-0" />;
  return <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-heading font-bold text-sm shrink-0">{initial}</div>;
}

export default function DashboardLayout({ children, navItems, title }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleLogout = () => { logout(); navigate("/"); };
  function itemBadge(item: NavItem) { return item.path.includes("notificacoes") && unreadCount > 0 ? unreadCount : 0; }

  return (
    <div className="min-h-screen bg-background md:pl-64">
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border shrink-0">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center"><Bus className="w-5 h-5 text-sidebar-primary-foreground" /></div>
          <div><h2 className="font-heading font-bold text-sidebar-foreground text-sm">OesteGoU</h2><p className="text-xs text-sidebar-foreground/60">{title}</p></div>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
          {navItems.map(item => { const active = location.pathname === item.path; const badge = itemBadge(item); return <button key={item.path} onClick={() => navigate(item.path)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? "bg-sidebar-accent text-sidebar-primary font-semibold" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}><item.icon className="w-5 h-5" /><span className="flex-1 text-left">{item.label}</span>{badge > 0 && <span className="min-w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-sidebar animate-pulse">{badge > 9 ? "9+" : badge}</span>}</button>; })}
        </nav>
        <div className="p-3 border-t border-sidebar-border shrink-0 bg-sidebar">
          <div className="flex items-center gap-3 px-3 py-2 mb-2"><UserAvatar name={user?.name} photo={user?.photo} /><div className="flex-1 min-w-0"><p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p><p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p></div><NotificationBell /></div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
        </div>
      </aside>

      <div className="min-h-screen flex flex-col">
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Bus className="w-4 h-4 text-primary-foreground" /></div><span className="font-heading font-bold text-sm">OesteGoU</span></div>
          <div className="flex items-center gap-2"><NotificationBell /><button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground">{mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button></div>
        </header>
        <AnimatePresence>
          {mobileOpen && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="md:hidden fixed top-[57px] left-0 right-0 z-50 bg-card border-b border-border p-3 space-y-1 shadow-lg max-h-[calc(100vh-57px)] overflow-y-auto">{navItems.map(item => { const active = location.pathname === item.path; const badge = itemBadge(item); return <button key={item.path} onClick={() => { navigate(item.path); setMobileOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted"}`}><item.icon className="w-5 h-5" /><span className="flex-1 text-left">{item.label}</span>{badge > 0 && <span className="min-w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-background animate-pulse">{badge > 9 ? "9+" : badge}</span>}</button>; })}<Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-muted-foreground mt-2"><LogOut className="w-4 h-4 mr-2" /> Sair</Button></motion.div>}
        </AnimatePresence>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
