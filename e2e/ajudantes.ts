import { expect, type Page } from '@playwright/test';
import { USUARIOS } from './ambiente';

export type Quem = keyof typeof USUARIOS;

/** Entra pela tela de login, como a pessoa faria. */
export async function entrar(page: Page, quem: Quem): Promise<void> {
  await page.goto('/entrar');
  await page.getByLabel('Usuário', { exact: true }).fill(USUARIOS[quem].login);
  await page.getByLabel('Senha', { exact: true }).fill(USUARIOS[quem].senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('navigation', { name: 'Abas principais' })).toBeVisible();
}

export async function sair(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: 'Entrar', level: 1 })).toBeVisible();
}

/** Data de hoje (AAAA-MM-DD) em São Paulo, a mesma que a API e a tela usam. */
export function hoje(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
