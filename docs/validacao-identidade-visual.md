# Validação da identidade visual — EstacionaFácil

Data: 02/11/2026. A validação inicial dos arquivos de `docs/img` está registrada abaixo. Após autorização do usuário, a identidade foi aplicada ao frontend; veja a seção de implementação ao final. Os arquivos originais foram preservados.

## Resultado

A identidade é coerente entre as três imagens: azul-marinho, azul vivo, amarelo e símbolo com letra F, carro e marcador de estacionamento. A fonte sugerida é Inter, já utilizada no frontend. A paleta não introduz vermelho.

A identidade pode orientar a aplicação, com ajustes de contraste e variantes de logo. Os originais não estão prontos para todos os usos: a versão horizontal tem texto escuro, o ícone perde detalhes em tamanhos pequenos e os PNGs são grandes para carregamento em celulares.

## Arquivos conferidos

| Arquivo em `docs/img`                                  | Dimensões   | Formato                                 | Uso indicado                                                          |
| ------------------------------------------------------ | ----------- | --------------------------------------- | --------------------------------------------------------------------- |
| `Branding Estaciona Fácil_ Gestão Inteligente.png`     | 1536 × 1024 | RGB, sem transparência; 1.586.905 bytes | Referência de identidade e paleta; não carregar como imagem do painel |
| `Logo Estaciona Fácil com Ícone de Estacionamento.png` | 2172 × 724  | RGBA, com transparência; 412.763 bytes  | Login/cabeçalho em fundo claro, após exportação otimizada             |
| `Ícone de Estacionamento com Carro e Letra F.png`      | 1254 × 1254 | RGBA, com transparência; 867.944 bytes  | Marca compacta e ícone de aplicação, com exportações por tamanho      |

O SVG antigo `estacionaFacil-logotipo.svg` continua presente. Os arquivos terminados em `:Zone.Identifier` são metadados de origem do download, não logos nem paletas; não devem ser usados como assets ou incluídos na entrega visual. Nenhum original foi alterado ou removido nesta validação.

## Paleta e contraste

Valores transcritos da prancha de branding. Contraste calculado por luminância relativa sRGB. Para texto normal, foi adotado o limite de 4,5:1 já coberto pelos testes do frontend. Os números abaixo avaliam texto; uma logo tem tratamento distinto e exige também inspeção de legibilidade.

| Cor       | Papel na prancha    | Aplicação indicada                                                                     |
| --------- | ------------------- | -------------------------------------------------------------------------------------- |
| `#0B1E3C` | Primária estrutural | Lateral, bloco institucional do login e texto escuro                                   |
| `#0D6EFD` | Secundária          | Ações, foco e destaques; separar do azul usado em textos sobre áreas claras            |
| `#FFC107` | Acento              | Avisos com texto escuro; evitar grandes superfícies saturadas                          |
| `#F4F6FA` | Superfície          | Fundo neutro e áreas claras; manter distinção entre página e cartões                   |
| `#22C55E` | Sucesso             | Marcadores e fundos com texto escuro; texto de sucesso precisa de variante mais escura |

| Texto     | Fundo     | Contraste | Texto normal                               |
| --------- | --------- | --------- | ------------------------------------------ |
| `#F4F6FA` | `#0B1E3C` | 15,34:1   | Aprovado                                   |
| `#FFFFFF` | `#0D6EFD` | 4,5008:1  | Aprovado, no limite; sem reduzir opacidade |
| `#0D6EFD` | `#F4F6FA` | 4,16:1    | Reprovado                                  |
| `#FFFFFF` | `#22C55E` | 2,28:1    | Reprovado                                  |
| `#FFFFFF` | `#FFC107` | 1,63:1    | Reprovado                                  |
| `#0B1E3C` | `#22C55E` | 7,28:1    | Aprovado                                   |
| `#0B1E3C` | `#FFC107` | 10,18:1   | Aprovado                                   |
| `#22C55E` | `#F4F6FA` | 2,11:1    | Reprovado                                  |

Variantes derivadas sugeridas, sem substituir as cores originais da identidade:

- Azul `#0B5ED7` para links/textos sobre `#F4F6FA`: 5,40:1.
- Verde `#15803D` para texto de sucesso: 4,64:1 sobre `#F4F6FA` e 5,02:1 sobre branco.
- Manter atraso/erro com texto ocre acessível e descrição textual, preservando a decisão de não usar vermelho. A nova prancha não define cor de erro, bordas, texto secundário ou estados desabilitados; esses tokens continuam necessários.

Não copiar os hexadecimais diretamente para todos os tokens atuais. `primaria` hoje serve tanto a botões quanto a links e textos: usar `#0D6EFD` indiscriminadamente faria algumas combinações falharem nos testes de contraste.

## Logos no computador e no celular

Foi montada uma prévia HTML temporária e capturada com Edge headless, usando os originais sem edição. Inspecionadas a logo horizontal a 240 px em fundo branco e marinho e o ícone a 16, 32, 40 e 64 px.

- A logo horizontal funciona em fundo branco. No marinho, a palavra ESTACIONA praticamente desaparece. A lateral e o bloco escuro do login precisam de uma variante clara ou de composição com o ícone e texto HTML claro.
- O ícone é reconhecível a 40–64 px; a 16 px, carro, F e marcador se confundem. Preparar uma versão simplificada para favicon e verificar a 16 e 32 px.
- Há margens transparentes nos PNGs, que reduzem o tamanho visível ao definir a largura do elemento. Exportar variantes com área de proteção controlada e testar na largura útil da lateral e no cabeçalho de 320 px.
- Preferir arquivos vetoriais originais quando disponíveis. Para os rasters, exportar versões menores/otimizadas com transparência; não entregar o ícone de 868 kB para uma exibição de 40 px.
- O monograma E. da revisão anterior foi substituído na integração: `Marca.tsx`, favicon e comprovante agora usam a identidade com F. Nas áreas escuras, o ícone original é acompanhado por texto HTML com contraste adequado.
- Os cartões de exemplo da prancha incluem vagas ocupadas/livres; são referências visuais e não representam funcionalidades já implementadas da Fase 1. Não acrescentar esses indicadores sem dados e regras correspondentes.

## Limites da validação inicial

A primeira etapa foi documental, matemática e visual, sem integração naquele momento. A etapa autorizada a seguir aplicou a marca e repetiu a validação do frontend. Não houve publicação, auditoria de marca registrada ou teste em aparelho físico.

## Aplicação no frontend — 02/11/2026

Implementada na branch local `feature/frontend-profissional`:

- `Marca.tsx`: logo horizontal em áreas claras (login móvel e comprovante); ícone acompanhado de texto claro na lateral e no login desktop; marca compacta no cabeçalho do celular. Os nomes acessíveis são mantidos.
- PNGs derivados em `apps/web/public/marca/`: `icone-48.png`, `icone-96.png`, `icone-192.png`, `logo-horizontal-480.png` e `logo-horizontal-960.png`. Foram feitas exportações determinísticas com recorte das margens externas transparentes e redução de resolução; nenhum desenho foi regenerado. Os ícones têm canvas quadrado, e os originais de `docs/img` permanecem intactos.
- Ícones de uso normal em aproximadamente 3 KB (48 px) e 8 KB (96 px), em vez dos 868 KB originais; logo horizontal em aproximadamente 31 KB (480 px) ou 101 KB (960 px). `srcSet` seleciona a resolução conforme o contexto; dimensões explícitas evitam mudanças de layout durante o carregamento.
- `public/favicon.svg`: variante vetorial simplificada com F, contorno azul e marcador amarelo; o HTML inclui também ícone de aplicativo de 192 px e cor de tema marinho.
- Tokens: `barra` e `texto` = `#0B1E3C`; `acao` = `#0D6EFD` para botões com texto branco; `primaria` = `#0B5ED7` para texto/link; `amarelo` = `#FFC107`; `marca-sucesso` = `#22C55E`; `ok` = `#15803D`; fundo = `#F4F6FA`. Ocre de erro/atraso permanece sem vermelho.
- Gráficos seguem a paleta azul/amarelo/verde; legendas têm texto escuro e as barras amarelas recebem contorno para manter a distinção sobre branco.
- Mantidas as animações, a redução de movimento, a navegação móvel, os cartões das tabelas e a impressão do comprovante.

Validação da integração: ver o registro atualizado em [handoff.md](../handoff.md). Os roteiros de navegador usam o modo de demonstração e não acessam o banco de dados real. A implantação da homologação continua anterior a estas mudanças.
