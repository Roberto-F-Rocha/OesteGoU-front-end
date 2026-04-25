# OesteGoU - Sistema de Transporte

## Visão Geral

O OesteGoU é um sistema completo de gerenciamento de transporte desenvolvido para facilitar a organização de rotas, horários e reservas de usuários em um ambiente acadêmico ou institucional. O sistema permite o controle de usuários, autenticação segura, gestão de horários e integração entre frontend e backend com banco de dados relacional.

O projeto foi desenvolvido com foco em escalabilidade, separação de responsabilidades e boas práticas de desenvolvimento backend e frontend.

---

## Arquitetura do Projeto

O sistema está dividido em duas partes principais:

### Backend
Responsável pela lógica de negócio, autenticação, regras de acesso e comunicação com o banco de dados.

Tecnologias utilizadas:
- Node.js
- TypeScript
- Express
- Prisma ORM
- PostgreSQL
- JWT (JSON Web Token)
- bcryptjs

### Frontend
Responsável pela interface do usuário e interação com a API.

Tecnologias utilizadas:
- React
- TypeScript
- Consumo de API REST

---

## Funcionalidades

### Autenticação
- Cadastro de usuários
- Login com JWT
- Controle de sessão via token

### Autorização
- Controle de acesso baseado em roles (ex: aluno, administrador)
- Proteção de rotas no backend

### Gestão de Usuários
- Criação de usuários
- Consulta de perfil autenticado

### Regras de Negócio
- Estrutura preparada para gestão de horários de transporte
- Controle de permissões para criação e seleção de rotas

---

## Estrutura do Backend

```
Back-end/
 ├── prisma/
 │   └── schema.prisma
 ├── src/
 │   ├── controllers/
 │   ├── middlewares/
 │   ├── routes/
 │   ├── lib/
 │   │   └── prisma.ts
 │   └── server.ts
 ├── .env
 ├── package.json
 └── tsconfig.json
```

---

## Banco de Dados

O projeto utiliza PostgreSQL como banco de dados principal, com Prisma ORM para modelagem e migrações.

### Principais entidades:
- User
- (Estrutura preparada para expansão: horários, rotas, reservas)

---

## Variáveis de Ambiente

O backend depende das seguintes variáveis:

```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco"
JWT_SECRET="sua_chave_secreta"
```

---

## Como Executar o Projeto

### Backend

Instalação de dependências:

```
npm install
```

Executar migrações do banco:

```
npx prisma migrate dev
```

Executar servidor em modo desenvolvimento:

```
npm run dev
```

Servidor será iniciado em:

```
http://localhost:3001
```

---

### Frontend

Instalação de dependências:

```
npm install
```

Executar aplicação:

```
npm run dev
```

---

## Endpoints Principais

### Autenticação

#### POST /register
Cria um novo usuário.

Exemplo:
```
{
  "nome": "Usuario",
  "email": "email@exemplo.com",
  "senha": "123456"
}
```

#### POST /login
Autentica usuário e retorna token JWT.

Exemplo:
```
{
  "email": "email@exemplo.com",
  "senha": "123456"
}
```

### Perfil

#### GET /perfil
Retorna dados do usuário autenticado.

Requer header:
```
Authorization: Bearer TOKEN
```

---

## Segurança

O sistema utiliza:
- Hash de senha com bcrypt
- Autenticação via JWT
- Middleware de proteção de rotas

---

## Próximos Passos

- Implementação completa de gestão de horários
- Regras avançadas de reserva de transporte
- Painel administrativo
- Integração completa frontend/backend

---

## Status do Projeto

Em desenvolvimento ativo

---

## Autor

Sistema desenvolvido pela Empresa Lateral-End LTDA

