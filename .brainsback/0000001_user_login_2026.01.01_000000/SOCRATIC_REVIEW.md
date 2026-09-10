# Socratic Review

**Modelo da IA:** DeepSeek V4 Flash
**Data:** 2026-09-10

## Verificação de Tarefas
- Tarefa 1 (Autenticação de Usuários): Concluída. Backend com registro/login/logout via JWT + bcrypt, frontend com formulários de auth e persistência em localStorage.

# Parte A — Tarefa 1 (Autenticação de Usuários)

## Revisão Reflexiva
O desenvolvedor demonstrou compreensão sólida do fluxo de autenticação implementado, incluindo o ciclo completo de registro, login, persistência de sessão e logout. Articulou corretamente os papéis de cada camada (modelos, schemas, serviços, rotas) e os mecanismos de segurança empregados.

## Debate Socrático

**Pergunta 1 (Registro duplicado e auto-login):** Quando um usuário se cadastra, o que acontece no backend se alguém tentar cadastrar um email que já existe? E depois que o cadastro é bem-sucedido, o que o frontend faz em seguida?
**Resposta:** Se o email já existe, o backend retorna 409 Conflict com "Email ja cadastrado." e não cria outro usuário. Se o cadastro dá certo, o frontend chama o /api/auth/login automaticamente e salva o JWT recebido.
**Avaliação técnica:** Correto. A validação de unicidade no backend evita duplicatas, e o auto-login após registro proporciona experiência contínua ao usuário.

**Pergunta 2 (JWT stateless):** Se eu parar o servidor e ligar de novo, os tokens que já foram emitidos continuam válidos? Por quê?
**Resposta:** Sim, os tokens continuam válidos depois de reiniciar o servidor, desde que ainda não tenham expirado. Isso acontece porque o JWT é stateless: sua validade é verificada pela assinatura e pelo exp, não por uma sessão armazenada na memória do servidor.
**Avaliação técnica:** Correto. JWT é intrinsecamente stateless — a verificação depende apenas da chave secreta e do timestamp de expiração, não de estado armazenado no servidor.

**Pergunta 3 (Senhas):** Qual função do services/auth.py é usada para transformar a senha antes de guardar? E qual função é usada para comparar a senha na hora do login?
**Resposta:** No cadastro, a função hash_password() transforma a senha em um hash bcrypt antes de salvar. No login, verify_password() compara a senha informada com o hash armazenado.
**Avaliação técnica:** Correto. bcrypt.hashpw para hashing e bcrypt.checkpw para verificação, garantindo que senhas nunca são armazenadas em texto puro.

**Pergunta 4 (localStorage):** O que acontece se eu fechar o navegador e abrir de novo? A sessão continua? E se eu limpar o localStorage manualmente?
**Resposta:** Sim, a sessão continua ao fechar e abrir o navegador, porque o localStorage permanece salvo. Se ele for limpo manualmente, o token desaparece e o frontend considera o usuário deslogado.
**Avaliação técnica:** Correto. localStorage tem persistência entre sessões do navegador, e a limpeza manual remove o token, fazendo o frontend retornar à tela de login.

**Pergunta 5 (Endpoint de logout):** Por que o endpoint de logout existe se a decisão real é do cliente?
**Resposta:** O endpoint existe para validar o token e deixar um ponto de extensão para uma futura revogação server-side. Na implementação atual, como o JWT é stateless, a ação efetiva do logout é simplesmente apagar o token no cliente.
**Avaliação técnica:** Correto. O endpoint server-side valida o token e serve como ponto de extensão para blacklists de revogação, enquanto a ação imediata de logout permanece no cliente.

## Veredito
**Status:** MASTERY PROVEN