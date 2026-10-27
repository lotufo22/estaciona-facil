# Testes de ponta a ponta (Playwright)

Navegador de verdade, front (Vite), API (Express) e Postgres de teste, tudo junto. O roteiro de
`aceitacao.spec.ts` cobre os critérios 1 a 7 da seção 13 da spec; `capturas.spec.ts` gera as imagens
do manual em `docs/manual/capturas/`.

## Antes de rodar

1. Um Postgres só para teste, com o banco `estaciona_teste` (o nome precisa conter "test").
2. Na raiz, um `.env` com `DATABASE_URL_TESTE` apontando para ele (modelo em `.env.example`).
3. `npm ci`.
4. **Fora do CI** os testes usam o Microsoft Edge, que já vem com o Windows: não precisa baixar nada.
   No CI (variável `CI` definida) usam o Chromium do Playwright: `npx playwright install chromium`.

## Comandos

```
npm run e2e                                     # aceitação e capturas
npx playwright test --project=aceitacao         # só a aceitação
npx playwright show-report                      # relatório da última execução
```

## O que acontece quando roda

- O banco de `DATABASE_URL_TESTE` é **apagado**: `e2e/preparar-banco.ts` aplica as migrações, recria as
  49 vagas e os usuários `dono` e `auxiliar` (senha em `e2e/ambiente.ts`; só existem no banco de teste).
- A API sobe na porta 3101 e o front na 5174, para não esbarrar no seu `npm run dev`.
- O projeto `capturas` roda depois da aceitação, refaz o banco **com os dados de demonstração**
  (`scripts/dados-de-demonstracao.ts`: 3 contratos vencidos, 3 a vencer, 6 em dia e 5 meses de histórico)
  e salva as imagens.

A aceitação conta uma história única (cadastro, recebimento, despesa, painel), então os testes rodam em
ordem e dependem uns dos outros.
