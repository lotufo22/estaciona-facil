import { atender } from '../nucleo/api';

// Só `export default`: com um `handler` nomeado a Netlify trata a função como v1 e a empacota em CommonJS.
export default (requisicao: Request, contexto: { ip?: string }) => atender(requisicao, contexto);
