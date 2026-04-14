import { useState } from "react";
import { Users, Truck, GraduationCap, Calendar, MapPin, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { students, drivers, universities, schedules, weeklySchedules, confirmations } from "@/data/mockData";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const navItems = [
  { label: "Painel", path: "/admin", icon: Users },
  { label: "Alunos", path: "/admin/alunos", icon: GraduationCap },
  { label: "Motoristas", path: "/admin/motoristas", icon: Truck },
  { label: "Escalas", path: "/admin/escalas", icon: Calendar },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const activeStudents = students.filter(s => s.status === "active").length;
  const pendingStudents = students.filter(s => s.status === "pending").length;

  return (
    <DashboardLayout navItems={navItems} title="Administração">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground text-sm">Visão geral do sistema ALTO-BUS</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Alunos Ativos" value={activeStudents} icon={GraduationCap} color="primary" />
          <StatCard title="Pendentes" value={pendingStudents} icon={AlertCircle} color="warning" />
          <StatCard title="Motoristas" value={drivers.length} icon={Truck} color="accent" />
          <StatCard title="Universidades" value={universities.length} icon={MapPin} color="secondary" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="students">Alunos</TabsTrigger>
            <TabsTrigger value="schedules">Horários</TabsTrigger>
            <TabsTrigger value="confirmations">Confirmações</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Escala de Hoje
                </h3>
                <div className="space-y-3">
                  {weeklySchedules.filter(w => w.dayOfWeek === "Segunda").map(ws => (
                    <div key={ws.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm text-foreground">{ws.universityName}</p>
                        <p className="text-xs text-muted-foreground">{ws.driverName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Ida: {ws.departureTime}</p>
                        <p className="text-xs text-muted-foreground">Volta: {ws.returnTime}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-warning" /> Cadastros Pendentes
                </h3>
                <div className="space-y-3">
                  {students.filter(s => s.status === "pending").map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.institution} - {s.course}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8 text-xs">Aprovar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="students" className="mt-4">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-heading font-semibold text-foreground">Nome</th>
                      <th className="text-left p-3 font-heading font-semibold text-foreground hidden sm:table-cell">Instituição</th>
                      <th className="text-left p-3 font-heading font-semibold text-foreground hidden md:table-cell">Telefone</th>
                      <th className="text-left p-3 font-heading font-semibold text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <p className="font-medium text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </td>
                        <td className="p-3 hidden sm:table-cell text-muted-foreground">{s.institution}</td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">{s.phone}</td>
                        <td className="p-3">
                          <Badge variant={s.status === "active" ? "default" : s.status === "pending" ? "secondary" : "destructive"}>
                            {s.status === "active" ? "Ativo" : s.status === "pending" ? "Pendente" : "Inativo"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedules" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map(s => (
                <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl p-5">
                  <h4 className="font-heading font-semibold text-foreground mb-3">{s.universityName}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Ida: <span className="text-foreground font-medium">{s.departureTime}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground text-xs">{s.departureLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-accent" />
                      <span className="text-muted-foreground">Volta: <span className="text-foreground font-medium">{s.returnTime}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span className="text-muted-foreground text-xs">{s.returnLocation}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="confirmations" className="mt-4">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-heading font-semibold text-foreground">Aluno</th>
                      <th className="text-left p-3 font-heading font-semibold text-foreground hidden sm:table-cell">Universidade</th>
                      <th className="text-center p-3 font-heading font-semibold text-foreground">Ida</th>
                      <th className="text-center p-3 font-heading font-semibold text-foreground">Volta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmations.map(c => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="p-3 font-medium text-foreground">{c.studentName}</td>
                        <td className="p-3 hidden sm:table-cell text-muted-foreground">{c.universityName}</td>
                        <td className="p-3 text-center">
                          {c.goingTrip === true ? <CheckCircle className="w-5 h-5 text-success mx-auto" /> : c.goingTrip === false ? <XCircle className="w-5 h-5 text-destructive mx-auto" /> : <AlertCircle className="w-5 h-5 text-warning mx-auto" />}
                        </td>
                        <td className="p-3 text-center">
                          {c.returnTrip === true ? <CheckCircle className="w-5 h-5 text-success mx-auto" /> : c.returnTrip === false ? <XCircle className="w-5 h-5 text-destructive mx-auto" /> : <AlertCircle className="w-5 h-5 text-warning mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
