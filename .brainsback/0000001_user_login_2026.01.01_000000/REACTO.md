# Proof of Mastery (REACTO)

> Explain it to prove you own it.

**Hard rule**: AI agents must not edit this file and must not draft paste-ready content for it.

## R — Repeat (The Problem)
adicionar login e cadastro de usuários ao ChatLLM Lab.

o usuário precisa conseguir criar uma conta com email e senha, entrar, continuar autenticado depois de atualizar a página e sair quando quiser.

no backend, os usuários ficam salvos no SQLite. A senha não é salva diretamente: ela passa por bcrypt antes de ir para o banco. Depois do login, a API devolve um JWT que identifica o usuário e vale por 24 horas.

no frontend, o token fica salvo no localStorage para que a sessão continue. Quando o usuário faz logout, o token e o email são removidos.

## E — Examples
Login
{
  "email": "teste@exemplo.com",
  "password": "senha123"
}

POST /api/auth/login retorna:

{
  "access_token": "<JWT>",
  "token_type": "bearer"
}
Usuário logado

o GET /api/auth/me retorna:

{
  "id": 1,
  "email": "teste@exemplo.com"
}
Email já cadastrado

Tentando cadastrar o mesmo email novamente, a API retorna 409:

{
  "detail": "Email ja cadastrado."
}
Senha errada

Se o email ou a senha estiverem errados, o login retorna 401:

{
  "detail": "Email ou senha invalidos."
}
Logout

O POST /api/auth/logout valida o token e retorna:

{
  "message": "Logout realizado com sucesso."
}

## A — Approach
 user cuida da persistência, os schemas definem os dados da API, services/auth.py concentra bcrypt e JWT e routers/auth.py cuida dos endpoints. Para rotas autenticadas, get_current_user extrai o token, valida o JWT e busca o usuário no banco. No frontend, Auth.jsx cuida dos formulários e o App.jsx mantém o estado da sessão. No cadastro, depois que o usuário é criado, faz o login automaticamente.

## C — Code
as mudanças principais foram em backend/models/user.py, backend/schemas/auth.py, backend/services/auth.py e backend/routers/auth.py, além de config.py, main.py, models.py, Auth.jsx e App.jsx. User possui id, email, hashed_password e created_at; o serviço usa bcrypt.hashpw/checkpw para as senhas e python-jose para criar e validar os JWTs; o router expõe /register, /login, /logout e /me; e o frontend salva o token em localStorage e troca a interface entre usuário autenticado e tela de login.

## T — Tests
a validação foi feita manualmente com curl contra a API rodando, cobrindo cadastro, login, /me, cadastro duplicado e logout.
## O — Optimize
a solução está simples o suficiente e atende ao fluxo necessário