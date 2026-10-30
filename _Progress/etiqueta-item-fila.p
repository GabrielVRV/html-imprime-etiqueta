/* =========================================================
   etiqueta-item-fila.p
   Versao do esp/etiqueta-item.p para uso pela API REST.

   Monta a etiqueta igual ao original (mesmo modelo ITEM-CASP.prn,
   mesmos IDs de es-id-etiqueta-item e mesmos campos), mas em vez de
   copiar um arquivo para a impressora grava a folha na fila
   es-fila-etiqueta, que o roboEtiquetaItem imprime no servidor Windows -
   o servidor da API nao enxerga as impressoras.

   Diferencas propositais em relacao ao original:
     - erros viram excecao (antes: RETURN "NOK" ou falha silenciosa);
     - nenhum arquivo temporario (antes: nome fixo, conflitava entre
       sessoes simultaneas);
     - quantidade sempre com virgula decimal, independente do formato
       numerico da sessao do servidor.
   Deve rodar dentro da transacao de quem chama.
   ========================================================= */

BLOCK-LEVEL ON ERROR UNDO, THROW.

DEFINE INPUT  PARAMETER p-it-codigo   AS CHARACTER NO-UNDO.
DEFINE INPUT  PARAMETER p-quantidade  AS DECIMAL   NO-UNDO.
DEFINE INPUT  PARAMETER p-qtde-etiq   AS INTEGER   NO-UNDO.
DEFINE INPUT  PARAMETER p-lote        AS CHARACTER NO-UNDO.
DEFINE INPUT  PARAMETER p-serie       AS CHARACTER NO-UNDO.
DEFINE INPUT  PARAMETER p-impressora  AS CHARACTER NO-UNDO.
DEFINE INPUT  PARAMETER p-nr-ord-prod AS INTEGER   NO-UNDO.
DEFINE OUTPUT PARAMETER p-qtd-folhas  AS INTEGER   NO-UNDO.

&GLOBAL-DEFINE ETIQUETAS-POR-FOLHA 2
/* conteudo e' CHARACTER: o registro inteiro precisa caber em ~32 KB */
&GLOBAL-DEFINE TAMANHO-MAXIMO 30000

DEFINE VARIABLE cModelo      AS CHARACTER NO-UNDO.
DEFINE VARIABLE lcModelo     AS LONGCHAR  NO-UNDO.
DEFINE VARIABLE lcEtiqueta   AS LONGCHAR  NO-UNDO.
DEFINE VARIABLE cQuantidade  AS CHARACTER NO-UNDO.
DEFINE VARIABLE iIdEtiqueta1 AS INTEGER   NO-UNDO.
DEFINE VARIABLE iIdEtiqueta2 AS INTEGER   NO-UNDO.
DEFINE VARIABLE iFolha       AS INTEGER   NO-UNDO.

cModelo = SEARCH("etiquetas/ITEM-CASP.prn").
IF cModelo = ? THEN
    UNDO, THROW NEW Progress.Lang.AppError("Modelo etiquetas/ITEM-CASP.prn nao encontrado no PROPATH do servidor.", 1).

FIND FIRST item NO-LOCK WHERE item.it-codigo = p-it-codigo NO-ERROR.
IF NOT AVAILABLE item THEN
    UNDO, THROW NEW Progress.Lang.AppError(SUBSTITUTE("Item &1 nao cadastrado.", p-it-codigo), 1).

COPY-LOB FROM FILE cModelo TO lcModelo.

/* Quantidade sempre com virgula, no formato que o original gerava ("10,0", "0,5"),
   independente do formato numerico da sessao do servidor. */
cQuantidade = STRING(p-quantidade).
IF SESSION:NUMERIC-DECIMAL-POINT <> "," THEN
    cQuantidade = REPLACE(cQuantidade, SESSION:NUMERIC-DECIMAL-POINT, ",").
IF INDEX(cQuantidade, ",") = 0 THEN
    cQuantidade = cQuantidade + ",0".
IF p-quantidade < 1 THEN
    cQuantidade = "0" + cQuantidade.

p-qtd-folhas = INTEGER(TRUNCATE((p-qtde-etiq + {&ETIQUETAS-POR-FOLHA} - 1) / {&ETIQUETAS-POR-FOLHA}, 0)).

DO iFolha = 1 TO p-qtd-folhas:
    RUN pi-proximo-id (OUTPUT iIdEtiqueta1).
    RUN pi-proximo-id (OUTPUT iIdEtiqueta2).

    lcEtiqueta = lcModelo.
    lcEtiqueta = REPLACE(lcEtiqueta, "[COD-BARRA]",   STRING(iIdEtiqueta1, "99999") + p-it-codigo + "|" + cQuantidade + "|").
    lcEtiqueta = REPLACE(lcEtiqueta, "[COD-BARRA-2]", STRING(iIdEtiqueta2, "99999") + p-it-codigo + "|" + cQuantidade + "|").
    lcEtiqueta = REPLACE(lcEtiqueta, "[IT-CODIGO]",   p-it-codigo).
    lcEtiqueta = REPLACE(lcEtiqueta, "[QTDE]",        cQuantidade).
    lcEtiqueta = REPLACE(lcEtiqueta, "[DESCRICAO]",   item.descricao-1 + item.descricao-2).
    lcEtiqueta = REPLACE(lcEtiqueta, "[U]",           item.un).
    lcEtiqueta = REPLACE(lcEtiqueta, "[DEP]",         item.deposito-pad).
    lcEtiqueta = REPLACE(lcEtiqueta, "[LOTE]",        p-lote).
    lcEtiqueta = REPLACE(lcEtiqueta, "[SERIE]",       p-serie).
    lcEtiqueta = REPLACE(lcEtiqueta, "[OP]",          IF p-nr-ord-prod <> 0 THEN "OP:" ELSE "").
    lcEtiqueta = REPLACE(lcEtiqueta, "[NR-OP]",       IF p-nr-ord-prod <> 0 THEN STRING(p-nr-ord-prod) ELSE "").
    lcEtiqueta = REPLACE(lcEtiqueta, "[QT-ETIQ]",     "1").

    IF LENGTH(lcEtiqueta) > {&TAMANHO-MAXIMO} THEN
        UNDO, THROW NEW Progress.Lang.AppError("Etiqueta gerada maior que o campo es-fila-etiqueta.conteudo.", 1).

    CREATE es-fila-etiqueta.
    ASSIGN es-fila-etiqueta.destino  = TRIM(p-impressora)
           es-fila-etiqueta.conteudo = STRING(lcEtiqueta).
END.


/* Sequencial por item, de 1 a 99999 (volta a 1) - mesma regra do original.
   NO-WAIT para a API nao ficar presa se outra impressao do mesmo item
   estiver gravando ao mesmo tempo. */
PROCEDURE pi-proximo-id PRIVATE:
    DEFINE OUTPUT PARAMETER pId AS INTEGER NO-UNDO.

    FIND FIRST es-id-etiqueta-item
        WHERE es-id-etiqueta-item.it-codigo = p-it-codigo
        EXCLUSIVE-LOCK NO-WAIT NO-ERROR.

    IF LOCKED es-id-etiqueta-item THEN
        UNDO, THROW NEW Progress.Lang.AppError(
            SUBSTITUTE("Outra impressao do item &1 esta em andamento. Tente novamente.", p-it-codigo), 1).

    IF NOT AVAILABLE es-id-etiqueta-item THEN DO:
        CREATE es-id-etiqueta-item.
        ASSIGN es-id-etiqueta-item.it-codigo   = p-it-codigo
               es-id-etiqueta-item.dt-criado   = TODAY
               es-id-etiqueta-item.id-etiqueta = 0.
    END.

    es-id-etiqueta-item.id-etiqueta = IF es-id-etiqueta-item.id-etiqueta >= 99999
                                      THEN 1
                                      ELSE es-id-etiqueta-item.id-etiqueta + 1.
    pId = es-id-etiqueta-item.id-etiqueta.
END PROCEDURE.
