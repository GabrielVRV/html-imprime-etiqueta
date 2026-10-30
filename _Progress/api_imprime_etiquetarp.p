/* =========================================================
   api_imprime_etiquetarp.p
   Regras de negocio da impressao de etiquetas de separacao
   Projeto: Imprime Etiqueta | Logistica CASP | OpenEdge 12.8

   O que e' "pendente" segue o mesmo criterio de falta da ESFT4006 /
   Pedidos Sequenciados (pi-monta-faltas):
     - item do pedido COM ordem de producao nas linhas validas:
       cada componente reservado na OP, pendente = quant-orig - quant-atend;
       componente que tem OP propria na mesma sequencia (subconjunto)
       nao entra - ele aparece como uma ordem separada.
     - item do pedido SEM ordem de producao: o proprio item, agrupado
       na "ordem" 0, pendente = qt-pedida - qt-separada (es-ped-item-separ).
   ========================================================= */

BLOCK-LEVEL ON ERROR UNDO, THROW.

{include/api_imprime_etiqueta.i}

&GLOBAL-DEFINE LINHAS-VALIDAS "6,23,24,33,34"
&GLOBAL-DEFINE MAXIMO-ETIQUETAS 998
&GLOBAL-DEFINE ESTADOS-ORDEM "Nao Iniciada,Liberada,Alocada,Separada,Requisitada,Iniciada,Finalizada,Terminada"
/* Ordem aberta = estado 1 a 6 de {&ESTADOS-ORDEM} (fora Finalizada e Terminada) */
&GLOBAL-DEFINE ULTIMO-ESTADO-ORDEM-ABERTA 6
/* Valor de {&TIPO-IMPRESSORA-ETIQUETA} em cdp/api_cadastro_impressora.i */
&GLOBAL-DEFINE TIPO-IMPRESSORA-ETIQUETA 1
&GLOBAL-DEFINE MAXIMO-POR-PAGINA 50
/* 1 Aberto, 2 Atendido Parcial, 4 Pendente (este so' com saldo em aberto).
   Fora: 3 Atendido Total, 5 Suspenso, 6 Cancelado. */
&GLOBAL-DEFINE SITUACOES-ABERTAS "1,2,4"
/* Saldo do item mostrado na separacao: fora o que ja' esta' separado
   (localizacoes de separacao e reserva) e os depositos que nao servem para separar.
   O deposito PRP so' conta para pedido PRP (pi-usa-deposito-prp). */
&GLOBAL-DEFINE DEPOSITOS-FORA-SALDO "CON,RET,CQ"
&GLOBAL-DEFINE LOCALIZACOES-FORA-SALDO "separacao_prp,separacao_ordem,reserva_ordem"
&GLOBAL-DEFINE ESTABELECIMENTO-SALDO "1"
&GLOBAL-DEFINE DEPOSITO-PRP "PRP"
&GLOBAL-DEFINE TIPOS-PEDIDO-PRP "01,02,03,04,05,20,21,22,23,24,25,26,28,29,42,43,44,45,46,77,87,88"

/* Pedidos em aberto (e da busca) ainda sem saber se tem pendencia, na
   ordem da lista. A chave e' nr-pedido: ROWID nao pode ser indexado. */
DEFINE TEMP-TABLE tt-candidato NO-UNDO
    FIELD nr-pedido  AS INTEGER
    FIELD dt-entrega AS DATE
    INDEX idx-pedido IS UNIQUE nr-pedido
    INDEX idx-entrega IS PRIMARY dt-entrega nr-pedido.


/* ---------------------------------------------------------
   Rotas
   --------------------------------------------------------- */

/* Lista so o que a separacao precisa: pedidos em aberto com pelo menos
   um item pendente. Situacao igual ao Pedidos Sequenciados: fora
   atendidos totalmente, suspensos, cancelados e pendentes sem saldo.

   Saber se o pedido tem pendencia e' caro (monta ordens e reservas), por
   isso a lista e' paginada e para assim que completa a pagina. A busca
   filtra antes dessa montagem: pedido do cliente ou cliente comecando
   pelo texto, ou o numero exato do pedido. */
PROCEDURE pi-listar-pedidos:
    DEFINE INPUT  PARAMETER pBusca   AS CHARACTER NO-UNDO.
    DEFINE INPUT  PARAMETER pPagina  AS INTEGER   NO-UNDO.
    DEFINE INPUT  PARAMETER pTamanho AS INTEGER   NO-UNDO.
    DEFINE OUTPUT PARAMETER TABLE FOR tt_pedido.
    DEFINE OUTPUT PARAMETER pTemMais AS LOGICAL   NO-UNDO.

    DEFINE VARIABLE iPular    AS INTEGER NO-UNDO.
    DEFINE VARIABLE iNaPagina AS INTEGER NO-UNDO.

    EMPTY TEMP-TABLE tt_pedido.

    IF pPagina < 1 THEN
        pPagina = 1.
    IF pTamanho < 1 OR pTamanho > {&MAXIMO-POR-PAGINA} THEN
        pTamanho = {&MAXIMO-POR-PAGINA}.

    iPular = (pPagina - 1) * pTamanho.

    RUN pi-coleta-candidatos (INPUT TRIM(pBusca)).

    FOR EACH tt-candidato USE-INDEX idx-entrega,
        FIRST ped-venda NO-LOCK
        WHERE ped-venda.nr-pedido = tt-candidato.nr-pedido:

        RUN pi-monta-pedido (BUFFER ped-venda).
        IF NOT CAN-FIND(FIRST tt_item WHERE tt_item.quant_pendente > 0) THEN NEXT.

        IF iPular > 0 THEN DO:
            iPular = iPular - 1.
            NEXT.
        END.

        IF iNaPagina = pTamanho THEN DO:
            pTemMais = YES.
            LEAVE.
        END.

        RUN pi-cria-tt-pedido (BUFFER ped-venda).
        iNaPagina = iNaPagina + 1.
    END.
END PROCEDURE.


/* Cada leitura usa um indice proprio: com "<>" ou com OR entre os
   criterios o Progress lia a tabela inteira (WHOLE-INDEX).

   Sem busca, a lista parte das ordens abertas com reserva pendente, e
   nao dos pedidos: de ~7 mil pedidos em aberto so' uma fracao minima tem
   pendencia, e descobrir isso montando pedido por pedido levava minutos.
   Pedido cujo unico pendente e' item sem ordem nao entra nessa lista -
   ele continua sendo achado pela busca. */
PROCEDURE pi-coleta-candidatos PRIVATE:
    DEFINE INPUT PARAMETER pBusca AS CHARACTER NO-UNDO.

    DEFINE VARIABLE iEstado   AS INTEGER NO-UNDO.
    DEFINE VARIABLE iNrPedido AS INTEGER NO-UNDO.

    EMPTY TEMP-TABLE tt-candidato.

    IF pBusca = "" THEN DO:
        /* indice estado (estado) da ord-prod; reservas pelo indice codigo
           (nr-ord-produ, it-codigo); pedido pelo ch-pedido (nome-abrev, nr-pedcli) */
        DO iEstado = 1 TO {&ULTIMO-ESTADO-ORDEM-ABERTA}:
            FOR EACH ord-prod NO-LOCK
               WHERE ord-prod.estado = iEstado:

                IF ord-prod.nr-pedido = "" THEN NEXT.
                IF LOOKUP(STRING(ord-prod.nr-linha), {&LINHAS-VALIDAS}) = 0 THEN NEXT.
                IF NOT CAN-FIND(FIRST reservas
                                WHERE reservas.nr-ord-produ = ord-prod.nr-ord-produ
                                  AND reservas.quant-orig   > reservas.quant-atend) THEN NEXT.

                FIND ped-venda NO-LOCK
                    WHERE ped-venda.nome-abrev = ord-prod.nome-abrev
                      AND ped-venda.nr-pedcli  = ord-prod.nr-pedido NO-ERROR.
                IF AVAILABLE ped-venda THEN
                    RUN pi-adiciona-candidato (BUFFER ped-venda).
            END.
        END.
        RETURN.
    END.

    /* indice ch-nr-pedcli (nr-pedcli, nome-abrev) */
    FOR EACH ped-venda NO-LOCK
       WHERE ped-venda.nr-pedcli BEGINS pBusca:
        RUN pi-adiciona-candidato (BUFFER ped-venda).
    END.

    /* indice ch-pedido (nome-abrev, nr-pedcli) */
    FOR EACH ped-venda NO-LOCK
       WHERE ped-venda.nome-abrev BEGINS pBusca:
        RUN pi-adiciona-candidato (BUFFER ped-venda).
    END.

    /* indice ch-pedseq (nr-pedido) */
    ASSIGN iNrPedido = INTEGER(pBusca) NO-ERROR.
    IF iNrPedido > 0 THEN
        FOR FIRST ped-venda NO-LOCK
            WHERE ped-venda.nr-pedido = iNrPedido:
            RUN pi-adiciona-candidato (BUFFER ped-venda).
        END.
END PROCEDURE.


PROCEDURE pi-adiciona-candidato PRIVATE:
    DEFINE PARAMETER BUFFER pPedVenda FOR ped-venda.

    IF LOOKUP(STRING(pPedVenda.cod-sit-ped), {&SITUACOES-ABERTAS}) = 0 THEN RETURN.
    IF pPedVenda.cod-sit-ped = 4 AND (pPedVenda.vl-liq-abe = ? OR pPedVenda.vl-liq-abe <= 0) THEN RETURN.
    IF CAN-FIND(tt-candidato WHERE tt-candidato.nr-pedido = pPedVenda.nr-pedido) THEN RETURN.

    CREATE tt-candidato.
    ASSIGN tt-candidato.nr-pedido  = pPedVenda.nr-pedido
           tt-candidato.dt-entrega = pPedVenda.dt-entrega.
END PROCEDURE.


PROCEDURE pi-obter-pedido:
    DEFINE INPUT  PARAMETER pNrPedido AS INTEGER NO-UNDO.
    DEFINE OUTPUT PARAMETER TABLE FOR tt_pedido.
    DEFINE OUTPUT PARAMETER TABLE FOR tt_ordem.

    EMPTY TEMP-TABLE tt_pedido.

    FIND ped-venda NO-LOCK WHERE ped-venda.nr-pedido = pNrPedido NO-ERROR.
    IF NOT AVAILABLE ped-venda THEN
        UNDO, THROW NEW Progress.Lang.AppError(SUBSTITUTE("Pedido &1 nao encontrado.", pNrPedido), 1).

    RUN pi-monta-pedido (BUFFER ped-venda).
    RUN pi-cria-tt-pedido (BUFFER ped-venda).
END PROCEDURE.


PROCEDURE pi-obter-ordem:
    DEFINE INPUT  PARAMETER pNrPedido AS INTEGER NO-UNDO.
    DEFINE INPUT  PARAMETER pNrOrdProd AS INTEGER NO-UNDO.
    DEFINE OUTPUT PARAMETER TABLE FOR tt_ordem.
    DEFINE OUTPUT PARAMETER TABLE FOR tt_item.

    DEFINE VARIABLE lUsaPrp AS LOGICAL NO-UNDO.

    FIND ped-venda NO-LOCK WHERE ped-venda.nr-pedido = pNrPedido NO-ERROR.
    IF NOT AVAILABLE ped-venda THEN
        UNDO, THROW NEW Progress.Lang.AppError(SUBSTITUTE("Pedido &1 nao encontrado.", pNrPedido), 1).

    RUN pi-monta-pedido (BUFFER ped-venda).

    IF NOT CAN-FIND(tt_ordem WHERE tt_ordem.nr_ord_prod = pNrOrdProd) THEN
        UNDO, THROW NEW Progress.Lang.AppError(
            SUBSTITUTE("Ordem &1 nao pertence ao pedido &2.", pNrOrdProd, pNrPedido), 1).

    FOR EACH tt_ordem WHERE tt_ordem.nr_ord_prod <> pNrOrdProd:
        DELETE tt_ordem.
    END.
    FOR EACH tt_item WHERE tt_item.nr_ord_prod <> pNrOrdProd:
        DELETE tt_item.
    END.

    /* So' aqui, e nao no pi-monta-pedido: a lista de pedidos nao mostra
       saldo e ler o estoque de cada componente deixaria a lista lenta. */
    RUN pi-usa-deposito-prp (INPUT ped-venda.tp-pedido, OUTPUT lUsaPrp).
    FOR EACH tt_item:
        RUN pi-calcula-saldo (INPUT  tt_item.it_codigo,
                              INPUT  lUsaPrp,
                              OUTPUT tt_item.quant_saldo).
    END.
END PROCEDURE.


/* Impressoras de etiqueta ativas do Cadastro de Impressoras (es-impressora).
   Recebe a tabela por TABLE-HANDLE e copia por nome de campo (BUFFER-COPY):
   com TABLE a estrutura teria que ser identica a do cadastro (erro 5363
   quando diverge), e aqui so' interessam nome e caminho. */
PROCEDURE pi-listar-impressoras:
    DEFINE OUTPUT PARAMETER TABLE FOR tt_impressora.

    DEFINE VARIABLE hCadastro AS HANDLE NO-UNDO.
    DEFINE VARIABLE hTabela   AS HANDLE NO-UNDO.
    DEFINE VARIABLE hBuffer   AS HANDLE NO-UNDO.
    DEFINE VARIABLE hQuery    AS HANDLE NO-UNDO.

    EMPTY TEMP-TABLE tt_impressora.

    RUN cdp/api_cadastro_impressoraRP.p PERSISTENT SET hCadastro.
    RUN pi-listar-impressoras-ativas IN hCadastro (INPUT  {&TIPO-IMPRESSORA-ETIQUETA},
                                                   OUTPUT TABLE-HANDLE hTabela).

    hBuffer = hTabela:DEFAULT-BUFFER-HANDLE.
    CREATE QUERY hQuery.
    hQuery:SET-BUFFERS(hBuffer).
    hQuery:QUERY-PREPARE(SUBSTITUTE("FOR EACH &1 NO-LOCK", hBuffer:NAME)).
    hQuery:QUERY-OPEN().

    DO WHILE hQuery:GET-NEXT():
        CREATE tt_impressora.
        BUFFER tt_impressora:BUFFER-COPY(hBuffer).
    END.

    FINALLY:
        IF VALID-HANDLE(hQuery) THEN DO:
            hQuery:QUERY-CLOSE().
            DELETE OBJECT hQuery.
        END.
        IF VALID-HANDLE(hTabela) THEN
            DELETE OBJECT hTabela.
        IF VALID-HANDLE(hCadastro) THEN
            DELETE PROCEDURE hCadastro.
    END FINALLY.
END PROCEDURE.


/* Grava todas as folhas numa transacao so': se uma etiqueta falhar,
   nada vai para a fila do roboEtiquetaItem (sem impressao pela metade). */
PROCEDURE pi-imprimir:
    DEFINE INPUT  PARAMETER pImpressora AS CHARACTER NO-UNDO.
    DEFINE INPUT  PARAMETER pLote       AS CHARACTER NO-UNDO.
    DEFINE INPUT  PARAMETER pSerie      AS CHARACTER NO-UNDO.
    DEFINE INPUT  PARAMETER TABLE FOR tt_etiqueta.
    DEFINE OUTPUT PARAMETER TABLE FOR tt_resultado.

    DEFINE VARIABLE iFolhas      AS INTEGER NO-UNDO.
    DEFINE VARIABLE iFolhasTotal AS INTEGER NO-UNDO.

    EMPTY TEMP-TABLE tt_resultado.

    RUN pi-valida-impressao (INPUT pImpressora).

    DO TRANSACTION:
        FOR EACH tt_etiqueta:
            RUN cpp/etiqueta-item-fila.p (INPUT  tt_etiqueta.it_codigo,
                                          INPUT  tt_etiqueta.quantidade,
                                          INPUT  tt_etiqueta.qtd_etiquetas,
                                          INPUT  pLote,
                                          INPUT  pSerie,
                                          INPUT  pImpressora,
                                          INPUT  tt_etiqueta.nr_ord_prod,
                                          OUTPUT iFolhas).
            iFolhasTotal = iFolhasTotal + iFolhas.
        END.
    END.

    CREATE tt_resultado.
    tt_resultado.qtd_folhas = iFolhasTotal.
END PROCEDURE.


/* ---------------------------------------------------------
   Montagem das ordens e itens de um pedido
   --------------------------------------------------------- */
PROCEDURE pi-monta-pedido PRIVATE:
    DEFINE PARAMETER BUFFER pPedVenda FOR ped-venda.

    DEFINE BUFFER bOrdProd FOR ord-prod.

    DEFINE VARIABLE lTemOrdem AS LOGICAL NO-UNDO.

    EMPTY TEMP-TABLE tt_ordem.
    EMPTY TEMP-TABLE tt_item.

    FOR EACH ped-item OF pPedVenda NO-LOCK
       WHERE ped-item.cod-sit-item < 3,
        FIRST es-ped-item-fat OF ped-item NO-LOCK:

        lTemOrdem = NO.

        FOR EACH bOrdProd NO-LOCK
           WHERE bOrdProd.nome-abrev   = ped-item.nome-abrev
             AND bOrdProd.nr-pedido    = ped-item.nr-pedcli
             AND bOrdProd.nr-sequencia = ped-item.nr-sequencia:

            IF LOOKUP(STRING(bOrdProd.nr-linha), {&LINHAS-VALIDAS}) = 0 THEN NEXT.

            lTemOrdem = YES.
            RUN pi-adiciona-ordem (BUFFER bOrdProd, BUFFER ped-item).
        END.

        IF NOT lTemOrdem THEN
            RUN pi-adiciona-item-sem-ordem (BUFFER ped-item).
    END.

    RUN pi-totaliza-ordens.
END PROCEDURE.


PROCEDURE pi-adiciona-ordem PRIVATE:
    DEFINE PARAMETER BUFFER pOrdProd FOR ord-prod.
    DEFINE PARAMETER BUFFER pPedItem FOR ped-item.

    DEFINE BUFFER bSubconjunto FOR ord-prod.
    DEFINE BUFFER bItem        FOR item.

    FIND FIRST bItem NO-LOCK WHERE bItem.it-codigo = pOrdProd.it-codigo NO-ERROR.

    CREATE tt_ordem.
    ASSIGN tt_ordem.nr_ord_prod  = pOrdProd.nr-ord-produ
           tt_ordem.nr_sequencia = pOrdProd.nr-sequencia
           tt_ordem.it_codigo    = pOrdProd.it-codigo
           tt_ordem.desc_item    = IF AVAILABLE bItem THEN bItem.desc-item ELSE ""
           tt_ordem.qt_ordem     = pOrdProd.qt-ordem
           tt_ordem.estado       = IF pOrdProd.estado >= 1 AND pOrdProd.estado <= NUM-ENTRIES({&ESTADOS-ORDEM})
                                   THEN ENTRY(pOrdProd.estado, {&ESTADOS-ORDEM})
                                   ELSE STRING(pOrdProd.estado).

    FOR EACH reservas OF pOrdProd NO-LOCK:
        IF CAN-FIND(FIRST bSubconjunto
                    WHERE bSubconjunto.nome-abrev   = pPedItem.nome-abrev
                      AND bSubconjunto.nr-pedido    = pPedItem.nr-pedcli
                      AND bSubconjunto.nr-sequencia = pPedItem.nr-sequencia
                      AND bSubconjunto.it-codigo    = reservas.it-codigo
                      AND LOOKUP(STRING(bSubconjunto.nr-linha), {&LINHAS-VALIDAS}) > 0) THEN NEXT.

        RUN pi-acumula-item (INPUT pOrdProd.nr-ord-produ,
                             INPUT reservas.it-codigo,
                             INPUT reservas.quant-orig,
                             INPUT reservas.quant-atend).
    END.
END PROCEDURE.


PROCEDURE pi-adiciona-item-sem-ordem PRIVATE:
    DEFINE PARAMETER BUFFER pPedItem FOR ped-item.

    DEFINE VARIABLE dQtSeparada AS DECIMAL NO-UNDO.

    IF NOT CAN-FIND(tt_ordem WHERE tt_ordem.nr_ord_prod = 0) THEN DO:
        CREATE tt_ordem.
        ASSIGN tt_ordem.nr_ord_prod = 0
               tt_ordem.desc_item   = "Itens do pedido sem ordem de producao".
        /* nr_ord_prod = 0 e' o valor inicial: sem mudanca na chave o ABL so'
           grava o indice quando o registro sai do buffer, e o CAN-FIND do
           proximo item sem ordem nao o enxergaria (erro 132). */
        RELEASE tt_ordem.
    END.

    FOR EACH es-ped-item-separ NO-LOCK
       WHERE es-ped-item-separ.nome-abrev   = pPedItem.nome-abrev
         AND es-ped-item-separ.nr-pedcli    = pPedItem.nr-pedcli
         AND es-ped-item-separ.nr-sequencia = pPedItem.nr-sequencia
         AND es-ped-item-separ.it-codigo    = pPedItem.it-codigo:
        dQtSeparada = dQtSeparada + es-ped-item-separ.qt-separada.
    END.

    RUN pi-acumula-item (INPUT 0,
                         INPUT pPedItem.it-codigo,
                         INPUT pPedItem.qt-pedida,
                         INPUT dQtSeparada).
END PROCEDURE.


/* O mesmo componente pode aparecer em mais de uma reserva da OP (ou em
   mais de uma sequencia sem OP) - soma numa linha so'. */
PROCEDURE pi-acumula-item PRIVATE:
    DEFINE INPUT PARAMETER pNrOrdProd AS INTEGER   NO-UNDO.
    DEFINE INPUT PARAMETER pItCodigo  AS CHARACTER NO-UNDO.
    DEFINE INPUT PARAMETER pQtOrig    AS DECIMAL   NO-UNDO.
    DEFINE INPUT PARAMETER pQtAtend   AS DECIMAL   NO-UNDO.

    DEFINE BUFFER bItem FOR item.

    FIND tt_item
        WHERE tt_item.nr_ord_prod = pNrOrdProd
          AND tt_item.it_codigo   = pItCodigo NO-ERROR.
    IF NOT AVAILABLE tt_item THEN DO:
        FIND FIRST bItem NO-LOCK WHERE bItem.it-codigo = pItCodigo NO-ERROR.

        CREATE tt_item.
        ASSIGN tt_item.nr_ord_prod = pNrOrdProd
               tt_item.it_codigo   = pItCodigo
               tt_item.desc_item   = IF AVAILABLE bItem THEN bItem.desc-item ELSE ""
               tt_item.un          = IF AVAILABLE bItem THEN bItem.un ELSE "".
    END.

    ASSIGN tt_item.quant_orig     = tt_item.quant_orig  + pQtOrig
           tt_item.quant_atend    = tt_item.quant_atend + pQtAtend
           tt_item.quant_pendente = MAXIMUM(0, tt_item.quant_orig - tt_item.quant_atend).
END PROCEDURE.


/* Pedido PRP pode usar o saldo do deposito PRP; os demais nao. */
PROCEDURE pi-usa-deposito-prp PRIVATE:
    DEFINE INPUT  PARAMETER p-tp-pedido AS CHARACTER NO-UNDO.
    DEFINE OUTPUT PARAMETER p-usa-prp   AS LOGICAL   NO-UNDO.

    p-usa-prp = LOOKUP(TRIM(p-tp-pedido), {&TIPOS-PEDIDO-PRP}) > 0.
END PROCEDURE.


/* Saldo atual do item no estabelecimento {&ESTABELECIMENTO-SALDO}, sem os
   depositos e localizacoes fora do saldo. */
PROCEDURE pi-calcula-saldo PRIVATE:
    DEFINE INPUT  PARAMETER pItCodigo AS CHARACTER NO-UNDO.
    DEFINE INPUT  PARAMETER pUsaPrp   AS LOGICAL   NO-UNDO.
    DEFINE OUTPUT PARAMETER pSaldo    AS DECIMAL   NO-UNDO.

    FOR EACH saldo-estoq NO-LOCK
       WHERE saldo-estoq.it-codigo   = pItCodigo
         AND saldo-estoq.cod-estabel = {&ESTABELECIMENTO-SALDO}:

        IF LOOKUP(TRIM(saldo-estoq.cod-depos), {&DEPOSITOS-FORA-SALDO}) > 0 THEN NEXT.
        IF LOOKUP(TRIM(saldo-estoq.cod-localiz), {&LOCALIZACOES-FORA-SALDO}) > 0 THEN NEXT.
        IF TRIM(saldo-estoq.cod-depos) = {&DEPOSITO-PRP} AND NOT pUsaPrp THEN NEXT.

        pSaldo = pSaldo + saldo-estoq.qtidade-atu.
    END.
END PROCEDURE.


PROCEDURE pi-totaliza-ordens PRIVATE:
    FOR EACH tt_ordem:
        ASSIGN tt_ordem.qtd_itens           = 0
               tt_ordem.qtd_itens_pendentes = 0.

        FOR EACH tt_item WHERE tt_item.nr_ord_prod = tt_ordem.nr_ord_prod:
            tt_ordem.qtd_itens = tt_ordem.qtd_itens + 1.
            IF tt_item.quant_pendente > 0 THEN
                tt_ordem.qtd_itens_pendentes = tt_ordem.qtd_itens_pendentes + 1.
        END.
    END.
END PROCEDURE.


PROCEDURE pi-cria-tt-pedido PRIVATE:
    DEFINE PARAMETER BUFFER pPedVenda FOR ped-venda.

    CREATE tt_pedido.
    ASSIGN tt_pedido.nr_pedido    = pPedVenda.nr-pedido
           tt_pedido.nr_pedcli    = pPedVenda.nr-pedcli
           tt_pedido.cod_emitente = pPedVenda.cod-emitente
           tt_pedido.nome_abrev   = pPedVenda.nome-abrev
           tt_pedido.dt_entrega   = pPedVenda.dt-entrega.

    FOR EACH tt_ordem:
        IF tt_ordem.nr_ord_prod <> 0 THEN
            tt_pedido.qtd_ordens = tt_pedido.qtd_ordens + 1.
        ASSIGN tt_pedido.qtd_itens           = tt_pedido.qtd_itens + tt_ordem.qtd_itens
               tt_pedido.qtd_itens_pendentes = tt_pedido.qtd_itens_pendentes + tt_ordem.qtd_itens_pendentes.
    END.
END PROCEDURE.


/* ---------------------------------------------------------
   Validacoes da impressao
   --------------------------------------------------------- */
PROCEDURE pi-valida-impressao PRIVATE:
    DEFINE INPUT PARAMETER pImpressora AS CHARACTER NO-UNDO.

    DEFINE VARIABLE hCadastro AS HANDLE  NO-UNDO.
    DEFINE VARIABLE lValida   AS LOGICAL NO-UNDO.

    /* O destino vira um caminho de arquivo no servidor do robo: so'
       aceita impressora de etiqueta cadastrada e ativa, nunca um caminho livre. */
    RUN cdp/api_cadastro_impressoraRP.p PERSISTENT SET hCadastro.
    RUN pi-impressora-valida IN hCadastro (INPUT  pImpressora,
                                           INPUT  {&TIPO-IMPRESSORA-ETIQUETA},
                                           OUTPUT lValida).
    IF NOT lValida THEN
        UNDO, THROW NEW Progress.Lang.AppError("Impressora nao cadastrada ou inativa no Cadastro de Impressoras.", 1).

    IF NOT CAN-FIND(FIRST tt_etiqueta) THEN
        UNDO, THROW NEW Progress.Lang.AppError("Nenhuma etiqueta informada.", 1).

    FOR EACH tt_etiqueta:
        IF tt_etiqueta.quantidade <= 0 THEN
            UNDO, THROW NEW Progress.Lang.AppError(
                SUBSTITUTE("Quantidade por etiqueta invalida para o item &1.", tt_etiqueta.it_codigo), 1).

        IF tt_etiqueta.qtd_etiquetas < 2 OR tt_etiqueta.qtd_etiquetas > {&MAXIMO-ETIQUETAS} THEN
            UNDO, THROW NEW Progress.Lang.AppError(
                SUBSTITUTE("Numero de etiquetas do item &1 deve ficar entre 2 e &2.",
                           tt_etiqueta.it_codigo, {&MAXIMO-ETIQUETAS}), 1).

        /* O modelo imprime 2 etiquetas por folha: impar sairia com uma a mais. */
        IF tt_etiqueta.qtd_etiquetas MODULO 2 <> 0 THEN
            UNDO, THROW NEW Progress.Lang.AppError(
                SUBSTITUTE("Numero de etiquetas do item &1 deve ser par.", tt_etiqueta.it_codigo), 1).
    END.

    FINALLY:
        IF VALID-HANDLE(hCadastro) THEN
            DELETE PROCEDURE hCadastro.
    END FINALLY.
END PROCEDURE.
