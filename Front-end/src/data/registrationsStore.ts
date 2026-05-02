import { confirmations as mockConfirmations, drivers as mockDrivers, schedules as baseSchedules, students as mockStudents, weeklySchedules } from "@/data/mockData";

export type StoredAdmin = {
  id: string;
  city: string;
  state: string;
  secretariatName: string;
  secretariatEmail: string;
  responsible: {
    name: string;
    cpf: string;
    email: string;
    phone: string;
    birthDate: string;
    photo: string | null;
    password: string;
  };
};

export type StoredDocument = {
  name: string;
  dataUrl: string;
  type: string;
  size: number;
};

export type StoredUser = {
  id: string;
  role: "student" | "driver";
  name: string;
  cpf?: string;
  email: string;
  password?: string;
  phone: string;
  birthDate: string;
  institution?: string;
  photo: string | null;
  docName?: string | null;
  docFile?: StoredDocument | null;
  cnhName?: string | null;
  cnhFile?: StoredDocument | null;
  assignedScheduleId?: string | null;
  address: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  status: "pending" | "active";
  createdAt: string;
};

export type StoredSchedule = {
  id: string;
  city: string;
  state: string;
  title: string;
  dayOfWeek: string;
  departureTime: string;
  departureLocation: string;
  returnTime: string;
  returnLocation: string;
  driverId: string | null;
};

export type TripStatus = boolean | null;
export type NotificationStatus = "pending_notification" | "notified";

export type StoredConfirmation = {
  id: string;
  studentId: string;
  city: string;
  universityName: string;
  date: string;
  goingTrip: TripStatus;
  returnTrip: TripStatus;
  goingNotificationStatus: NotificationStatus;
  returnNotificationStatus: NotificationStatus;
};

const admins: StoredAdmin[] = [];
const users: StoredUser[] = [];
const schedules: StoredSchedule[] = [];
const confirmations: StoredConfirmation[] = [];
let bootstrapped = false;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  admins.push(
    {
      id: "admin-seed-riacho",
      city: "Riacho da Cruz",
      state: "RN",
      secretariatName: "Secretaria Municipal de Educação",
      secretariatEmail: "educacao@riachodacruz.rn.gov.br",
      responsible: {
        name: "Administrador",
        cpf: "000.000.000-00",
        email: "admin@altobus.com",
        phone: "(84) 99999-0000",
        birthDate: "1985-01-01",
        photo: null,
        password: "admin123",
      },
    },
    {
      id: "admin-seed-pau",
      city: "Pau dos Ferros",
      state: "RN",
      secretariatName: "Secretaria Municipal de Educação",
      secretariatEmail: "educacao@paudosferros.rn.gov.br",
      responsible: {
        name: "Gestor Pau dos Ferros",
        cpf: "111.111.111-11",
        email: "admin.pau@altobus.com",
        phone: "(84) 98888-0000",
        birthDate: "1988-02-10",
        photo: null,
        password: "admin123",
      },
    },
  );

  users.push(
    ...mockStudents.map((student, index) => ({
      id: student.id,
      role: "student" as const,
      name: student.name,
      cpf: student.cpf,
      email: student.email,
      password: index === 0 ? "aluno123" : "123456",
      phone: student.phone,
      birthDate: "2002-01-01",
      institution: student.institution,
      photo: student.photo ?? null,
      docName: "matricula.pdf",
      docFile: null,
      assignedScheduleId: null,
      address: {
        cep: "59820-000",
        street: "Rua Principal",
        number: String(index + 10),
        neighborhood: "Centro",
        city: "Riacho da Cruz",
        state: "RN",
      },
      status: student.status === "inactive" ? "pending" : student.status,
      createdAt: new Date().toISOString(),
    })),
    ...mockDrivers.map((driver, index) => ({
      id: driver.id,
      role: "driver" as const,
      name: driver.name,
      email: index === 0 ? "motorista@altobus.com" : driver.email,
      password: index === 0 ? "motorista123" : "123456",
      phone: driver.phone,
      birthDate: "1987-03-15",
      photo: driver.photo ?? null,
      cnhName: "cnh-digital.pdf",
      cnhFile: null,
      assignedScheduleId: null,
      address: {
        cep: "59820-000",
        street: "Rua dos Motoristas",
        number: String(index + 1),
        neighborhood: "Centro",
        city: "Riacho da Cruz",
        state: "RN",
      },
      status: "active" as const,
      createdAt: new Date().toISOString(),
    })),
  );

  schedules.push(
    ...weeklySchedules.map((weekly) => {
      const details = baseSchedules.find((schedule) => schedule.id === weekly.scheduleId);
      return {
        id: weekly.id,
        city: "Riacho da Cruz",
        state: "RN",
        title: weekly.universityName,
        dayOfWeek: weekly.dayOfWeek,
        departureTime: weekly.departureTime,
        departureLocation: details?.departureLocation ?? "Terminal Central",
        returnTime: weekly.returnTime,
        returnLocation: details?.returnLocation ?? weekly.universityName,
        driverId: weekly.driverId,
      } satisfies StoredSchedule;
    }),
  );

  for (const schedule of schedules) {
    const driver = users.find((user) => user.role === "driver" && user.id === schedule.driverId);
    if (driver) driver.assignedScheduleId = schedule.id;
  }

  confirmations.push(
    ...mockStudents.map((student) => {
      const confirmation = mockConfirmations.find((item) => item.studentId === student.id);
      return {
        id: confirmation?.id ?? `confirmation-${student.id}`,
        studentId: student.id,
        city: "Riacho da Cruz",
        universityName: student.institution,
        date: confirmation?.date ?? new Date().toISOString().slice(0, 10),
        goingTrip: confirmation?.goingTrip ?? null,
        returnTrip: confirmation?.returnTrip ?? null,
        goingNotificationStatus: confirmation?.goingTrip === null || !confirmation ? "pending_notification" : "notified",
        returnNotificationStatus: confirmation?.returnTrip === null || !confirmation ? "pending_notification" : "notified",
      } satisfies StoredConfirmation;
    }),
  );
}

function ensureConfirmation(studentId: string, city: string, universityName: string): StoredConfirmation {
  bootstrap();
  let existing = confirmations.find((item) => item.studentId === studentId);
  if (!existing) {
    existing = {
      id: crypto.randomUUID(),
      studentId,
      city,
      universityName,
      date: new Date().toISOString().slice(0, 10),
      goingTrip: null,
      returnTrip: null,
      goingNotificationStatus: "pending_notification",
      returnNotificationStatus: "pending_notification",
    };
    confirmations.push(existing);
  }
  return existing;
}

function syncDriverSchedule(driverId: string, scheduleId: string | null) {
  bootstrap();
  const driver = users.find((user) => user.id === driverId && user.role === "driver");
  if (!driver) return;

  schedules.forEach((schedule) => {
    if (schedule.driverId === driverId) schedule.driverId = null;
  });

  driver.assignedScheduleId = null;

  if (!scheduleId) return;

  const targetSchedule = schedules.find((schedule) => schedule.id === scheduleId);
  if (!targetSchedule) return;

  if (targetSchedule.driverId && targetSchedule.driverId !== driverId) {
    const previousDriver = users.find((user) => user.id === targetSchedule.driverId && user.role === "driver");
    if (previousDriver) previousDriver.assignedScheduleId = null;
  }

  targetSchedule.driverId = driverId;
  driver.assignedScheduleId = targetSchedule.id;
}

export function addAdmin(a: Omit<StoredAdmin, "id">): StoredAdmin {
  bootstrap();
  const admin: StoredAdmin = { ...a, id: crypto.randomUUID() };
  admins.push(admin);
  return admin;
}

export function addUser(u: Omit<StoredUser, "id" | "createdAt" | "status">): StoredUser {
  bootstrap();
  const user: StoredUser = {
    ...u,
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  ensureConfirmation(user.id, user.address.city, user.institution ?? "Sem instituição");
  return user;
}

export function updateUser(id: string, data: Partial<Omit<StoredUser, "id" | "role" | "createdAt">>): StoredUser | undefined {
  bootstrap();
  const user = users.find((item) => item.id === id);
  if (!user) return undefined;

  const nextAssignedScheduleId = data.assignedScheduleId;
  const address = data.address ? { ...user.address, ...data.address } : user.address;

  Object.assign(user, { ...data, address });

  if (user.role === "driver" && nextAssignedScheduleId !== undefined) {
    syncDriverSchedule(user.id, nextAssignedScheduleId ?? null);
  }

  if (user.role === "student") {
    const confirmation = ensureConfirmation(user.id, user.address.city, user.institution ?? "Sem instituição");
    confirmation.city = user.address.city;
    confirmation.universityName = user.institution ?? confirmation.universityName;
  }

  return user;
}

export function getAdminByCity(city: string): StoredAdmin | undefined {
  bootstrap();
  return admins.find((a) => norm(a.city) === norm(city));
}

export function getAllAdmins(): StoredAdmin[] {
  bootstrap();
  return [...admins];
}

export function getUsersByCity(city: string): StoredUser[] {
  bootstrap();
  return users.filter((u) => norm(u.address.city) === norm(city));
}

export function getAllUsers(): StoredUser[] {
  bootstrap();
  return [...users];
}

export function getStudentsByCity(city: string): StoredUser[] {
  bootstrap();
  return users.filter((u) => u.role === "student" && norm(u.address.city) === norm(city));
}

export function getDriversByCity(city: string): StoredUser[] {
  bootstrap();
  return users.filter((u) => u.role === "driver" && norm(u.address.city) === norm(city));
}

export function generateTempPassword(length = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export type DriverByAdminInput = {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  cnhName: string;
  cnhFile?: StoredDocument | null;
  photo: string | null;
  city: string;
  state: string;
  tempPassword: string;
  assignedScheduleId?: string | null;
};

export function addDriverByAdmin(input: DriverByAdminInput): StoredUser {
  bootstrap();
  const user: StoredUser = {
    id: crypto.randomUUID(),
    role: "driver",
    name: input.name,
    email: input.email,
    password: input.tempPassword,
    phone: input.phone,
    birthDate: input.birthDate,
    photo: input.photo,
    cnhName: input.cnhName,
    cnhFile: input.cnhFile ?? null,
    assignedScheduleId: null,
    address: {
      cep: "",
      street: "",
      number: "",
      neighborhood: "",
      city: input.city,
      state: input.state,
    },
    status: "active",
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  syncDriverSchedule(user.id, input.assignedScheduleId ?? null);
  return user;
}

export function updateUserStatus(id: string, status: "pending" | "active"): void {
  bootstrap();
  const u = users.find((x) => x.id === id);
  if (u) u.status = status;
}

export function removeUser(id: string): void {
  bootstrap();
  const user = users.find((item) => item.id === id);
  if (user?.role === "driver") syncDriverSchedule(id, null);
  const idx = users.findIndex((x) => x.id === id);
  if (idx >= 0) users.splice(idx, 1);
  const confirmationIdx = confirmations.findIndex((item) => item.studentId === id);
  if (confirmationIdx >= 0) confirmations.splice(confirmationIdx, 1);
}

export function getSchedulesByCity(city: string): StoredSchedule[] {
  bootstrap();
  return schedules.filter((schedule) => norm(schedule.city) === norm(city));
}

export function addSchedule(input: Omit<StoredSchedule, "id">): StoredSchedule {
  bootstrap();
  const schedule: StoredSchedule = { ...input, id: crypto.randomUUID() };
  schedules.push(schedule);
  if (input.driverId) syncDriverSchedule(input.driverId, schedule.id);
  return schedule;
}

export function updateSchedule(id: string, data: Partial<Omit<StoredSchedule, "id" | "city" | "state">>): StoredSchedule | undefined {
  bootstrap();
  const schedule = schedules.find((item) => item.id === id);
  if (!schedule) return undefined;

  const nextDriverId = data.driverId;
  Object.assign(schedule, data);

  if (nextDriverId !== undefined) {
    if (nextDriverId) {
      syncDriverSchedule(nextDriverId, schedule.id);
    } else {
      if (schedule.driverId) syncDriverSchedule(schedule.driverId, null);
      schedule.driverId = null;
    }
  }

  return schedule;
}

export function removeSchedule(id: string): void {
  bootstrap();
  const schedule = schedules.find((item) => item.id === id);
  if (schedule?.driverId) syncDriverSchedule(schedule.driverId, null);
  const idx = schedules.findIndex((item) => item.id === id);
  if (idx >= 0) schedules.splice(idx, 1);
}

export function getConfirmationRowsByCity(city: string) {
  bootstrap();
  return getStudentsByCity(city).map((student) => {
    const confirmation = ensureConfirmation(student.id, student.address.city, student.institution ?? "Sem instituição");
    const hasPending = confirmation.goingTrip === null || confirmation.returnTrip === null;
    const pendingNotificationStatuses = [
      confirmation.goingTrip === null ? confirmation.goingNotificationStatus : null,
      confirmation.returnTrip === null ? confirmation.returnNotificationStatus : null,
    ].filter(Boolean) as NotificationStatus[];

    let notificationStatus: NotificationStatus | null = null;
    if (hasPending) {
      notificationStatus = pendingNotificationStatuses.includes("pending_notification")
        ? "pending_notification"
        : "notified";
    }

    return {
      student,
      confirmation,
      hasPending,
      notificationStatus,
    };
  });
}

export function markPendingNotificationsByStudent(studentId: string): void {
  bootstrap();
  const student = users.find((item) => item.id === studentId && item.role === "student");
  if (!student) return;
  const confirmation = ensureConfirmation(student.id, student.address.city, student.institution ?? "Sem instituição");
  if (confirmation.goingTrip === null) confirmation.goingNotificationStatus = "notified";
  if (confirmation.returnTrip === null) confirmation.returnNotificationStatus = "notified";
}

export function markPendingNotificationsByCity(city: string): void {
  bootstrap();
  getConfirmationRowsByCity(city)
    .filter((row) => row.hasPending)
    .forEach((row) => {
      if (row.confirmation.goingTrip === null) row.confirmation.goingNotificationStatus = "notified";
      if (row.confirmation.returnTrip === null) row.confirmation.returnNotificationStatus = "notified";
    });
}
