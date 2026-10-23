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
&GLOBAL-DEFINE MAXIMO-ETIQUETAS 999
&GLOBAL-DEFINE ESTADOS-ORDEM "Nao Iniciada,Liberada,Alocada,Separada,Requisitada,Iniciada,Finalizada,Terminada"

FUNCTION fn-desc-item RETURNS CHARACTER (INPUT pItCodigo AS CHARACTER):
    DEFINE BUFFER bItem FOR item.

    FIND FIRST bItem NO-LOCK WHERE bItem.it-codigo = pItCodigo NO-ERROR.
    RETURN IF AVAILABLE bItem THEN bItem.desc-item ELSE "".
END FUNCTION.

FUNCTION fn-un-item RETURNS CHARACTER (INPUT pItCodigo AS CHARACTER):
    DEFINE BUFFER bItem FOR item.

    FIND FIRST bItem NO-LOCK WHERE bItem.it-codigo = pItCodigo NO-ERROR.
    RETURN IF AVAILABLE bItem THEN bItem.un ELSE "".
END FUNCTION.

FUNCTION fn-estado-ordem RETURNS CHARACTER (INPUT pEstado AS INTEGER):
    IF pEstado >= 1 AND pEstado <= NUM-ENTRIES({&ESTADOS-ORDEM}) THEN
        RETURN ENTRY(pEstado, {&ESTADOS-ORDEM}).
    RETURN STRING(pEstado).
END FUNCTION.

FUNCTION fn-linha-valida RETURNS LOGICAL (INPUT pNrLinha AS INTEGER):
    RETURN LOOKUP(STRING(pNrLinha), {&LINHAS-VALIDAS}) > 0.
END FUNCTION.


/* ---------------------------------------------------------
   Rotas
   --------------------------------------------------------- */
PROCEDURE pi-listar-pedidos:
    DEFINE INPUT  PARAMETER pDtEntregaIni AS DATE NO-UNDO.
    DEFINE INPUT  PARAMETER pDtEntregaFim AS DATE NO-UNDO.
    DEFINE OUTPUT PARAMETER TABLE FOR tt_pedido.

    EMPTY TEMP-TABLE tt_pedido.

    IF pDtEntregaIni = ? OR pDtEntregaFim = ? THEN
        UNDO, THROW NEW Progress.Lang.AppError("Informe o periodo de entrega.", 1).

    /* Mesmo filtro de situacao do Pedidos Sequenciados: fora atendidos
       totalmente, suspensos, cancelados e pendentes sem saldo em aberto. */
    FOR EACH ped-venda NO-LOCK
       WHERE ped-venda.dt-entrega >= pDtEntregaIni
         AND ped-venda.dt-entrega <= pDtEntregaFim
         AND ped-venda.cod-sit-ped <> 3
         AND ped-venda.cod-sit-ped <> 5
         AND ped-venda.cod-sit-ped <> 6
         AND (ped-venda.cod-sit-ped <> 4 OR ped-venda.vl-liq-abe > 0):

        RUN pi-monta-pedido (BUFFER ped-venda).
        IF CAN-FIND(FIRST tt_item) THEN
            RUN pi-cria-tt-pedido (BUFFER ped-venda).
    END.
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
END PROCEDURE.


PROCEDURE pi-listar-impressoras:
    DEFINE OUTPUT PARAMETER TABLE FOR tt_impressora.

    EMPTY TEMP-TABLE tt_impressora.

    FOR EACH impressoras-etiqueta NO-LOCK:
        CREATE tt_impressora.
        ASSIGN tt_impressora.area     = impressoras-etiqueta.area
               tt_impressora.endereco = impressoras-etiqueta.endereco.
    END.
END PROCEDURE.


/* Grava todas as folhas numa transacao so': se uma etiqueta falhar,
   nada vai para a fila do roboEtiqueta (sem impressao pela metade). */
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

            IF NOT fn-linha-valida(bOrdProd.nr-linha) THEN NEXT.

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

    CREATE tt_ordem.
    ASSIGN tt_ordem.nr_ord_prod  = pOrdProd.nr-ord-produ
           tt_ordem.nr_sequencia = pOrdProd.nr-sequencia
           tt_ordem.it_codigo    = pOrdProd.it-codigo
           tt_ordem.desc_item    = fn-desc-item(pOrdProd.it-codigo)
           tt_ordem.qt_ordem     = pOrdProd.qt-ordem
           tt_ordem.estado       = fn-estado-ordem(pOrdProd.estado).

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

    FIND tt_item
        WHERE tt_item.nr_ord_prod = pNrOrdProd
          AND tt_item.it_codigo   = pItCodigo NO-ERROR.
    IF NOT AVAILABLE tt_item THEN DO:
        CREATE tt_item.
        ASSIGN tt_item.nr_ord_prod = pNrOrdProd
               tt_item.it_codigo   = pItCodigo
               tt_item.desc_item   = fn-desc-item(pItCodigo)
               tt_item.un          = fn-un-item(pItCodigo).
    END.

    ASSIGN tt_item.quant_orig     = tt_item.quant_orig  + pQtOrig
           tt_item.quant_atend    = tt_item.quant_atend + pQtAtend
           tt_item.quant_pendente = MAXIMUM(0, tt_item.quant_orig - tt_item.quant_atend).
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

    /* O destino vira um caminho de arquivo no servidor do robo: so'
       aceita impressoras cadastradas, nunca um caminho livre. */
    IF NOT CAN-FIND(FIRST impressoras-etiqueta
                    WHERE impressoras-etiqueta.endereco = pImpressora) THEN
        UNDO, THROW NEW Progress.Lang.AppError("Impressora nao cadastrada em impressoras-etiqueta.", 1).

    IF NOT CAN-FIND(FIRST tt_etiqueta) THEN
        UNDO, THROW NEW Progress.Lang.AppError("Nenhuma etiqueta informada.", 1).

    FOR EACH tt_etiqueta:
        IF tt_etiqueta.quantidade <= 0 THEN
            UNDO, THROW NEW Progress.Lang.AppError(
                SUBSTITUTE("Quantidade por etiqueta invalida para o item &1.", tt_etiqueta.it_codigo), 1).

        IF tt_etiqueta.qtd_etiquetas < 1 OR tt_etiqueta.qtd_etiquetas > {&MAXIMO-ETIQUETAS} THEN
            UNDO, THROW NEW Progress.Lang.AppError(
                SUBSTITUTE("Numero de etiquetas do item &1 deve ficar entre 1 e &2.",
                           tt_etiqueta.it_codigo, {&MAXIMO-ETIQUETAS}), 1).
    END.
END PROCEDURE.
