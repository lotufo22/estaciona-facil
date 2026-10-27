import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { servidor } from '../mocks/servidor';
import { apiFetch, definirAoExpirar, ErroApiCliente } from './api';

const aoExpirar = vi.fn();

afterEach(() => {
  aoExpirar.mockReset();
});

function capturarCabecalhos(metodo: 'get' | 'post' | 'patch') {
  let cabecalhos: Headers | undefined;
  servidor.use(
    http[metodo]('/api/teste', ({ request }) => {
      cabecalhos = request.headers;
      return HttpResponse.json({ ok: true });
    }),
  );
  return () => cabecalhos;
}

describe('apiFetch', () => {
  it('leitura (GET) devolve o JSON e não envia o cabeçalho anti-CSRF', async () => {
    const lerCabecalhos = capturarCabecalhos('get');
    await expect(apiFetch<{ ok: boolean }>('/teste')).resolves.toEqual({ ok: true });
    expect(lerCabecalhos()?.get('x-estaciona-app')).toBeNull();
  });

  it('escrita (POST) envia X-Estaciona-App: 1 e o corpo em JSON', async () => {
    let corpo: unknown;
    let cabecalhos: Headers | undefined;
    servidor.use(
      http.post('/api/teste', async ({ request }) => {
        cabecalhos = request.headers;
        corpo = await request.json();
        return HttpResponse.json({ ok: true }, { status: 201 });
      }),
    );
    await apiFetch('/teste', { metodo: 'POST', corpo: { valor: '255.00' } });
    expect(cabecalhos?.get('x-estaciona-app')).toBe('1');
    expect(cabecalhos?.get('content-type')).toContain('application/json');
    expect(corpo).toEqual({ valor: '255.00' });
  });

  it('escrita (PATCH) também envia X-Estaciona-App', async () => {
    const lerCabecalhos = capturarCabecalhos('patch');
    await apiFetch('/teste', { metodo: 'PATCH', corpo: { telefone: '12999990000' } });
    expect(lerCabecalhos()?.get('x-estaciona-app')).toBe('1');
  });

  it('envia a Idempotency-Key quando informada', async () => {
    const lerCabecalhos = capturarCabecalhos('post');
    await apiFetch('/teste', { metodo: 'POST', corpo: {}, idempotencia: 'chave-123' });
    expect(lerCabecalhos()?.get('idempotency-key')).toBe('chave-123');
  });

  it('resposta 204 resolve sem corpo', async () => {
    servidor.use(http.post('/api/teste', () => new HttpResponse(null, { status: 204 })));
    await expect(apiFetch<void>('/teste', { metodo: 'POST' })).resolves.toBeUndefined();
  });

  it('422 vira ErroApiCliente com status, código, mensagem e campos', async () => {
    servidor.use(
      http.post('/api/teste', () =>
        HttpResponse.json(
          {
            erro: {
              codigo: 'DADOS_INVALIDOS',
              mensagem: 'Confira os campos.',
              campos: { valor: 'O valor deve ser maior que zero' },
            },
          },
          { status: 422 },
        ),
      ),
    );
    const erro = await apiFetch('/teste', { metodo: 'POST', corpo: {} }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApiCliente);
    expect(erro).toMatchObject({
      status: 422,
      codigo: 'DADOS_INVALIDOS',
      message: 'Confira os campos.',
      campos: { valor: 'O valor deve ser maior que zero' },
    });
  });

  it('erro sem corpo JSON (ex.: página HTML do servidor) vira mensagem genérica em português', async () => {
    servidor.use(
      http.get('/api/teste', () => new HttpResponse('<html>Erro</html>', { status: 500 })),
    );
    const erro = await apiFetch('/teste').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApiCliente);
    expect(erro).toMatchObject({
      status: 500,
      message: 'Não foi possível completar a operação. Tente de novo.',
    });
  });

  it('falha de rede vira ErroApiCliente SEM_CONEXAO', async () => {
    servidor.use(http.get('/api/teste', () => HttpResponse.error()));
    const erro = await apiFetch('/teste').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApiCliente);
    expect(erro).toMatchObject({ status: 0, codigo: 'SEM_CONEXAO' });
  });

  it('401 avisa que a sessão expirou e ainda lança o erro', async () => {
    definirAoExpirar(aoExpirar);
    servidor.use(
      http.get('/api/teste', () =>
        HttpResponse.json(
          { erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Entre para continuar.' } },
          { status: 401 },
        ),
      ),
    );
    await expect(apiFetch('/teste')).rejects.toMatchObject({ status: 401 });
    expect(aoExpirar).toHaveBeenCalledTimes(1);
  });

  it('401 com naoRedirecionarEm401 não avisa expiração (login e /auth/me)', async () => {
    definirAoExpirar(aoExpirar);
    servidor.use(
      http.get('/api/teste', () =>
        HttpResponse.json(
          { erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Entre para continuar.' } },
          { status: 401 },
        ),
      ),
    );
    await expect(apiFetch('/teste', { naoRedirecionarEm401: true })).rejects.toMatchObject({
      status: 401,
    });
    expect(aoExpirar).not.toHaveBeenCalled();
  });
});
