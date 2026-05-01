export function lgpdFilter(user) {
  if (!user) return user;

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    // dados sensíveis NÃO retornam
  };
}

export function maskCpf(cpf) {
  if (!cpf) return null;
  return cpf.replace(/(\d{3})\d{5}(\d{3})/, "$1*****$2");
}

export function maskPhone(phone) {
  if (!phone) return null;
  return phone.replace(/(\d{2})\d{5}(\d{2})/, "$1*****$2");
}
