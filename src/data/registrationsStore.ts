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
