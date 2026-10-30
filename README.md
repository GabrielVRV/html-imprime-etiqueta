# Imprime Etiqueta

Tela web (PO-UI + Angular) para imprimir as etiquetas de item da separação do romaneio,
substituindo o uso manual da ESCP1001.

Fluxo: **Pedidos → Ordens do pedido → Itens da ordem → Imprimir**. Os itens com
quantidade pendente (`quant-orig - quant-atend` das reservas) já vêm marcados; a
quantidade por etiqueta e o número de etiquetas são sugeridos e editáveis.

## Estrutura

```
HTML/                      front Angular 21 + PO-UI 21
  src/app/
    core/                  infraestrutura: cliente da API ut-api, carregamento com signals, preferências
    domain/                modelos, contratos dos repositórios e regras puras (sem Angular/HTTP)
    data/
      http/                repositórios reais: DTOs (tt_*) e mappers
      mock/                repositórios com dados fictícios para rodar sem servidor
    features/              telas: pedidos, pedido-detalhe, ordem-itens, impressao (modal)
    shared/                componentes e utilitários reutilizados entre telas
_Progress/
  api_imprime_etiqueta.i   temp-tables (contrato JSON com o front)
  api_imprime_etiqueta.p   rotas REST (ut-api)
  api_imprime_etiquetarp.p regras: pedidos, ordens, itens pendentes, impressão
  etiqueta-item-fila.p     versão do esp/etiqueta-item.p que grava na fila do roboEtiquetaItem
  es-fila-etiqueta.df      tabela da fila de etiquetas
  roboEtiquetaItem.w/.wrx  robô que imprime a fila de etiquetas
Exemplo/                   fontes de referência (ESCP1001, etiqueta-item, roboEtiqueta, .df)
```

As telas dependem só de `PedidoRepository` / `ImpressaoRepository` (domain). Qual
implementação entra (mock ou HTTP) é decidido em `data/provide-repositories.ts`
pelo `environment.useMock`.

## Rotas da API

Base: `/api/cpp/v1/api_imprime_etiqueta/` — todas `POST`, erros de negócio em `tt_retorno`.

| Rota | Payload | Retorno |
|---|---|---|
| `pedidos/` | `busca`, `pagina`, `tamanho` (sem busca: pedidos das OPs abertas com reserva pendente; com busca: qualquer pedido em aberto com item pendente; por entrega) | `tt_pedido`, `tt_pagina.tem_mais` |
| `pedido/` | `nr_pedido` | `tt_pedido`, `tt_ordem` |
| `ordem/` | `nr_pedido`, `nr_ord_prod` (0 = itens sem ordem) | `tt_ordem`, `tt_item` |
| `impressoras/` | — | `tt_impressora` (impressoras de etiqueta ativas do Cadastro de Impressoras) |
| `imprimir/` | `impressora`, `lote`, `serie`, `tt_etiqueta[]` | `tt_resultado.qtd_folhas` |

A impressão não fala com a impressora: grava uma folha (2 etiquetas) por registro em
`es-fila-etiqueta`, e o **roboEtiquetaItem** imprime. Por isso a tela informa
"enviado para a fila", não "impresso".

O `roboEtiquetaItem` é separado do `roboEtiqueta`, que imprime cupom fiscal: uma impressora
de etiqueta parada não pode segurar os cupons. Cada folha vai direto para a impressora com
`OS-COPY`, como no `esp/etiqueta-item.p`. Se a cópia falhar, a folha fica na fila, tenta de novo
na próxima batida do timer e o erro aparece na janela do robô até uma cópia dar certo. O título
da janela mostra a impressora em envio: se a cópia prender, é lá que se vê em qual delas parou.

## Desenvolvimento

```bash
cd HTML
npm install
npm start          # http://localhost:4200 com dados mock
npm test           # testes unitários (Vitest)
npm run build      # build de produção em HTML/dist/imprime-etiqueta
```

> `npm install` com o npm 10 falhou com `Cannot read properties of null (reading 'edgesOut')`;
> com `npx npm@11 install` funciona.

## Implantação

1. Carregar `_Progress/es-fila-etiqueta.df` no banco `mgesp`.
2. Compilar `_Progress/roboEtiquetaItem.w` (com o `.wrx` ao lado) e deixar o robô rodando no servidor Windows que enxerga as impressoras.
3. Compilar `_Progress/api_imprime_etiqueta.p`, `api_imprime_etiquetarp.p` e
   `etiqueta-item-fila.p` (o `.i` vai em `include/`; os `.p` em `cpp/`, igual ao Pedidos Sequenciados).
4. Publicar a API no mesmo módulo `cpp` das outras APIs.
5. `npm run build` e copiar o conteúdo de `HTML/dist/imprime-etiqueta/` para a pasta HTML publicada no Datasul.

A ordem importa: com a API publicada antes do robô, as etiquetas ficam na fila sem ninguém imprimir.

## Roteiro de testes no servidor

1. **Compilação** dos três `.p` sem erro (confirmar nomes de campos: `ord-prod.nr-ord-produ`,
   `reservas.quant-orig/quant-atend`, `es-ped-item-separ.qt-separada`).
2. **`pedidos/`**: traz só pedidos com item pendente, 20 por página? Medir o tempo da 1ª página e de uma busca pelo pedido do cliente.
3. **`pedido/` e `ordem/`** de um pedido conferido na mão: ordens, itens e pendentes batem com a ESFT4006?
   Conferir se faz sentido ignorar subconjuntos com OP própria e as linhas `6,23,24,33,34`.
4. **`impressoras/`** traz só as impressoras de **etiqueta ativas** do Cadastro de Impressoras (`cdp/api_cadastro_impressoraRP.p` precisa estar compilado no mesmo servidor).
5. **PROPATH**: a API encontra `etiquetas/ITEM-CASP.prn` (senão o erro diz isso).
6. **Formato decimal**: imprimir quantidade 15,5 e 0,5 → etiqueta e código de barras com `15,5` e `0,5`.
7. **Etiqueta idêntica**: imprimir o mesmo item pela ESCP1001 e pela tela nova e comparar
   (o original gravava com `EXPORT`, que põe aspas; o robô usa `PUT CONTROL`, sem aspas).
8. **Acentos** na descrição saem corretos (o robô grava sem conversão, como o original).
9. **Transação**: pedir impressão com um item inexistente junto de um válido → nada entra na fila.
10. **Impressora não cadastrada, inativa ou de outro tipo** no payload é recusada.
11. **Impressora parada**: com uma impressora offline, observar se o robô continua respondendo e o que o título da janela mostra.
12. **Falha de cópia**: com um caminho inválido, a folha continua na fila, o erro aparece na janela e o robô segue imprimindo nas outras impressoras.
