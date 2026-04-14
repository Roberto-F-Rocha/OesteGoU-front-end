export interface Student {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  institution: string;
  course: string;
  status: "pending" | "active" | "inactive";
  photo?: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
}

export interface University {
  id: string;
  name: string;
  courses: string[];
}

export interface Schedule {
  id: string;
  universityId: string;
  universityName: string;
  departureTime: string;
  departureLocation: string;
  returnTime: string;
  returnLocation: string;
}

export interface WeeklySchedule {
  id: string;
  dayOfWeek: string;
  driverId: string;
  driverName: string;
  scheduleId: string;
  universityName: string;
  departureTime: string;
  returnTime: string;
}

export interface Confirmation {
  id: string;
  studentId: string;
  studentName: string;
  universityName: string;
  date: string;
  goingTrip: boolean | null;
  returnTrip: boolean | null;
}

export const universities: University[] = [
  { id: "u1", name: "UFMG", courses: ["Engenharia Civil", "Medicina", "Direito", "Computação"] },
  { id: "u2", name: "PUC Minas", courses: ["Administração", "Psicologia", "Arquitetura"] },
  { id: "u3", name: "UFOP", courses: ["Geologia", "Mineração", "Engenharia Ambiental"] },
];

export const students: Student[] = [
  { id: "s1", name: "João Silva", cpf: "123.456.789-00", email: "joao@email.com", phone: "(31) 99999-0001", institution: "UFMG", course: "Engenharia Civil", status: "active" },
  { id: "s2", name: "Maria Santos", cpf: "234.567.890-11", email: "maria@email.com", phone: "(31) 99999-0002", institution: "UFMG", course: "Medicina", status: "active" },
  { id: "s3", name: "Pedro Oliveira", cpf: "345.678.901-22", email: "pedro@email.com", phone: "(31) 99999-0003", institution: "PUC Minas", course: "Psicologia", status: "pending" },
  { id: "s4", name: "Ana Costa", cpf: "456.789.012-33", email: "ana@email.com", phone: "(31) 99999-0004", institution: "UFOP", course: "Geologia", status: "active" },
  { id: "s5", name: "Lucas Pereira", cpf: "567.890.123-44", email: "lucas@email.com", phone: "(31) 99999-0005", institution: "UFMG", course: "Computação", status: "pending" },
];

export const drivers: Driver[] = [
  { id: "d1", name: "Carlos Oliveira", email: "carlos@email.com", phone: "(31) 98888-0001" },
  { id: "d2", name: "Roberto Almeida", email: "roberto@email.com", phone: "(31) 98888-0002" },
];

export const schedules: Schedule[] = [
  { id: "h1", universityId: "u1", universityName: "UFMG", departureTime: "06:00", departureLocation: "Terminal Central", returnTime: "18:00", returnLocation: "UFMG - Portaria Principal" },
  { id: "h2", universityId: "u2", universityName: "PUC Minas", departureTime: "06:30", departureLocation: "Terminal Central", returnTime: "17:30", returnLocation: "PUC - Entrada Sul" },
  { id: "h3", universityId: "u3", universityName: "UFOP", departureTime: "05:30", departureLocation: "Terminal Central", returnTime: "19:00", returnLocation: "UFOP - Praça Central" },
];

export const weeklySchedules: WeeklySchedule[] = [
  { id: "w1", dayOfWeek: "Segunda", driverId: "d1", driverName: "Carlos Oliveira", scheduleId: "h1", universityName: "UFMG", departureTime: "06:00", returnTime: "18:00" },
  { id: "w2", dayOfWeek: "Segunda", driverId: "d2", driverName: "Roberto Almeida", scheduleId: "h2", universityName: "PUC Minas", departureTime: "06:30", returnTime: "17:30" },
  { id: "w3", dayOfWeek: "Terça", driverId: "d1", driverName: "Carlos Oliveira", scheduleId: "h1", universityName: "UFMG", departureTime: "06:00", returnTime: "18:00" },
  { id: "w4", dayOfWeek: "Terça", driverId: "d2", driverName: "Roberto Almeida", scheduleId: "h3", universityName: "UFOP", departureTime: "05:30", returnTime: "19:00" },
  { id: "w5", dayOfWeek: "Quarta", driverId: "d1", driverName: "Carlos Oliveira", scheduleId: "h1", universityName: "UFMG", departureTime: "06:00", returnTime: "18:00" },
  { id: "w6", dayOfWeek: "Quinta", driverId: "d2", driverName: "Roberto Almeida", scheduleId: "h2", universityName: "PUC Minas", departureTime: "06:30", returnTime: "17:30" },
  { id: "w7", dayOfWeek: "Sexta", driverId: "d1", driverName: "Carlos Oliveira", scheduleId: "h3", universityName: "UFOP", departureTime: "05:30", returnTime: "19:00" },
];

export const confirmations: Confirmation[] = [
  { id: "c1", studentId: "s1", studentName: "João Silva", universityName: "UFMG", date: "2026-04-14", goingTrip: true, returnTrip: true },
  { id: "c2", studentId: "s2", studentName: "Maria Santos", universityName: "UFMG", date: "2026-04-14", goingTrip: true, returnTrip: false },
  { id: "c3", studentId: "s4", studentName: "Ana Costa", universityName: "UFOP", date: "2026-04-14", goingTrip: null, returnTrip: null },
];
