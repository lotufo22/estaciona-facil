import {
  contaAtualizarSchema,
  trocarSenhaSchema,
  usuarioAtualizarSchema,
  usuarioCriarSchema,
} from '@estacionafacil/shared';
import { Router } from 'express';
import { NOME_DO_COOKIE } from '../autenticacao/sessoes';
import type { Dependencias } from '../dependencias';
import { exigirLogin } from '../middlewares/exigirLogin';
import { exigirPerfil } from '../middlewares/exigirPerfil';
import {
  atualizarAuxiliar,
  atualizarNomeDaConta,
  cadastrarAuxiliar,
  listarUsuarios,
  trocarSenhaDaConta,
} from '../servicos/usuarios';
import { validar } from '../validacao';
import { idDaRota } from './mensalistas';

/** Gestão de auxiliares: só o proprietário. */
export function criarRotasUsuarios({ prisma }: Dependencias): Router {
  const rota = Router();
  rota.use(exigirLogin, exigirPerfil('proprietario'));

  rota.get('/', async (_req, res) => {
    res.json({ itens: await listarUsuarios(prisma) });
  });

  rota.post('/', async (req, res) => {
    const dados = validar(usuarioCriarSchema, req.body);
    res.status(201).json(await cadastrarAuxiliar(prisma, dados));
  });

  rota.patch('/:id', async (req, res) => {
    const id = idDaRota(req);
    const dados = validar(usuarioAtualizarSchema, req.body);
    res.json(await atualizarAuxiliar(prisma, id, dados));
  });

  return rota;
}

/** "Minha conta": qualquer usuário logado mexe só nos próprios dados. */
export function criarRotasConta({ prisma }: Dependencias): Router {
  const rota = Router();
  rota.use(exigirLogin);

  rota.patch('/', async (req, res) => {
    const { nome } = validar(contaAtualizarSchema, req.body);
    res.json(await atualizarNomeDaConta(prisma, req.usuario!.id, nome));
  });

  rota.post('/senha', async (req, res) => {
    const { senhaAtual, novaSenha } = validar(trocarSenhaSchema, req.body);
    const token = String((req.cookies as Record<string, unknown>)[NOME_DO_COOKIE] ?? '');
    await trocarSenhaDaConta(prisma, req.usuario!.id, token, senhaAtual, novaSenha);
    res.status(204).end();
  });

  return rota;
}
