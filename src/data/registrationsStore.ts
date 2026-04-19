// Simple in-memory store for registrations routed by city.
// Replaces the need for a backend in this demo. Data lives only for the session.

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
  };
};

export type StoredUser = {
  id: string;
  role: "student" | "driver";
  name: string;
  cpf?: string;
  email: string;
  phone: string;
  birthDate: string;
  institution?: string;
  photo: string | null;
  docName?: string | null;
  cnhName?: string | null;
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

const admins: StoredAdmin[] = [];
const users: StoredUser[] = [];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export function addAdmin(a: Omit<StoredAdmin, "id">): StoredAdmin {
  const admin: StoredAdmin = { ...a, id: crypto.randomUUID() };
  admins.push(admin);
  return admin;
}

export function addUser(u: Omit<StoredUser, "id" | "createdAt" | "status">): StoredUser {
  const user: StoredUser = {
    ...u,
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

export function getAdminByCity(city: string): StoredAdmin | undefined {
  return admins.find((a) => norm(a.city) === norm(city));
}

export function getUsersByCity(city: string): StoredUser[] {
  return users.filter((u) => norm(u.address.city) === norm(city));
}

export function getAllAdmins(): StoredAdmin[] {
  return [...admins];
}

export function getAllUsers(): StoredUser[] {
  return [...users];
}

export function getDriversByCity(city: string): StoredUser[] {
  return users.filter(
    (u) => u.role === "driver" && norm(u.address.city) === norm(city),
  );
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
  photo: string | null;
  city: string;
  state: string;
  tempPassword: string;
};

export function addDriverByAdmin(input: DriverByAdminInput): StoredUser {
  const user: StoredUser = {
    id: crypto.randomUUID(),
    role: "driver",
    name: input.name,
    email: input.email,
    phone: input.phone,
    birthDate: input.birthDate,
    photo: input.photo,
    cnhName: input.cnhName,
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
  return user;
}

export function updateUserStatus(id: string, status: "pending" | "active"): void {
  const u = users.find((x) => x.id === id);
  if (u) u.status = status;
}

export function removeUser(id: string): void {
  const idx = users.findIndex((x) => x.id === id);
  if (idx >= 0) users.splice(idx, 1);
}
