# Guia de Colaboração — Git & GitHub

Este documento define como o time vai trabalhar em conjunto no repositório. O objetivo é evitar conflitos, manter a `main` sempre estável e criar o hábito de revisão de código.

---

## 1. Estrutura de branches

| Branch | Propósito |
|---|---|
| `main` | Código estável. Nunca recebe commit direto. |
| `feature/nome-da-tarefa` | Uma branch por funcionalidade/tarefa nova |
| `fix/nome-do-bug` | Correção de bugs |
| `docs/nome-do-documento` | Alterações apenas de documentação |

**Regra de ouro:** ninguém trabalha direto na `main`. Toda alteração nasce em uma branch própria.

### Convenção de nomes
```
feature/login-usuario
fix/erro-calculo-total
docs/atualizar-readme
```
Use hífen, minúsculo, sem espaços ou acentos.

---

## 2. Fluxo de trabalho do dia a dia

### Passo 1 — Atualizar sua cópia local antes de começar
```bash
git checkout main
git pull origin main
```

### Passo 2 — Criar uma branch nova para a tarefa
```bash
git checkout -b feature/login-usuario
```

### Passo 3 — Trabalhar e commitar
```bash
git add .
git commit -m "feat: adiciona tela de login"
```

**Padrão de mensagem de commit (Conventional Commits):**
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` alteração de documentação
- `refactor:` refatoração sem mudar comportamento
- `test:` adição/ajuste de testes
- `chore:` tarefas de manutenção (configs, dependências)

### Passo 4 — Enviar a branch para o GitHub
```bash
git push origin feature/login-usuario
```
Na primeira vez que a branch é enviada, o Git vai sugerir o comando exato — pode copiar e colar.

### Passo 5 — Abrir um Pull Request (PR)
No GitHub, vá até a branch enviada e clique em **Compare & pull request**. Preencha:
- **Título** claro (o que foi feito)
- **Descrição**: o que mudou e por quê, e como testar
- Adicione pelo menos **1 revisor** (outro integrante do time)

### Passo 6 — Revisão de código (code review)
O revisor lê o código, comenta se necessário, e:
- Aprova → PR pode ser mesclado (merge)
- Solicita mudanças → autor ajusta e faz novo `push` na mesma branch (o PR atualiza automaticamente)

### Passo 7 — Merge na `main`
Depois de aprovado, clique em **Merge pull request** no GitHub (prefira **Squash and merge** para manter o histórico limpo).

### Passo 8 — Limpar
```bash
git checkout main
git pull origin main
git branch -d feature/login-usuario
```

---

## 3. Protegendo a branch `main`

Isso impede que alguém (inclusive você) dê push direto na `main` por engano:

1. Vá em **Settings → Branches** no repositório
2. Em **Branch protection rules**, clique em **Add rule**
3. Em "Branch name pattern", digite `main`
4. Marque:
   - **Require a pull request before merging**
   - **Require approvals** (defina 1 ou mais)
   - (Opcional) **Require status checks to pass** — útil se vocês tiverem testes automatizados depois

A partir daí, o GitHub bloqueia qualquer push direto na `main` — todo mundo é obrigado a passar por PR.

---

## 4. Lidando com conflitos

Se duas pessoas alteraram o mesmo trecho de código, ao tentar atualizar sua branch você pode ver um conflito:

```bash
git checkout feature/login-usuario
git pull origin main
```
O Git vai marcar os trechos em conflito no arquivo com `<<<<<<<`, `=======`, `>>>>>>>`. Edite manualmente escolhendo o que deve ficar, depois:
```bash
git add .
git commit -m "fix: resolve conflito com main"
git push origin feature/login-usuario
```

**Dica para reduzir conflitos:** sincronize sua branch com a `main` com frequência (`git pull origin main` dentro da sua branch), em vez de deixar semanas de trabalho acumulado sem integrar.

---

## 5. Checklist rápido para todo integrante

- [ ] Nunca commitar direto na `main`
- [ ] Sempre criar uma branch nova por tarefa
- [ ] Fazer `pull` da `main` antes de começar algo novo
- [ ] Escrever mensagens de commit claras
- [ ] Abrir PR com descrição do que foi feito
- [ ] Pedir revisão de pelo menos 1 pessoa antes do merge
- [ ] Apagar a branch depois do merge
