/* =========================================================
   api_imprime_etiqueta.i
   Temp-tables da API de impressao de etiquetas de separacao
   Projeto: Imprime Etiqueta | Logistica CASP

   Os nomes dos campos sao o contrato JSON com o front
   (HTML/src/app/data/http/dtos.ts) - mudou aqui, muda la.
   ========================================================= */

DEFINE TEMP-TABLE tt_pedido NO-UNDO
    FIELD nr_pedido           AS INTEGER
    FIELD nr_pedcli           AS CHARACTER
    FIELD cod_emitente        AS INTEGER
    FIELD nome_abrev          AS CHARACTER
    FIELD dt_entrega          AS DATE
    FIELD qtd_ordens          AS INTEGER
    FIELD qtd_itens           AS INTEGER
    FIELD qtd_itens_pendentes AS INTEGER
    INDEX idx-entrega dt_entrega nr_pedido.

/* nr_ord_prod = 0 agrupa os itens do pedido que nao tem ordem de producao */
DEFINE TEMP-TABLE tt_ordem NO-UNDO
    FIELD nr_ord_prod         AS INTEGER
    FIELD nr_sequencia        AS INTEGER
    FIELD it_codigo           AS CHARACTER
    FIELD desc_item           AS CHARACTER
    FIELD qt_ordem            AS DECIMAL
    FIELD estado              AS CHARACTER
    FIELD qtd_itens           AS INTEGER
    FIELD qtd_itens_pendentes AS INTEGER
    INDEX idx-ordem IS PRIMARY UNIQUE nr_ord_prod.

DEFINE TEMP-TABLE tt_item NO-UNDO
    FIELD nr_ord_prod    AS INTEGER
    FIELD it_codigo      AS CHARACTER
    FIELD desc_item      AS CHARACTER
    FIELD un             AS CHARACTER
    FIELD quant_orig     AS DECIMAL
    FIELD quant_atend    AS DECIMAL
    FIELD quant_pendente AS DECIMAL
    INDEX idx-item IS PRIMARY UNIQUE nr_ord_prod it_codigo.

/* Copiada por nome de campo da tt_impressora do Cadastro de Impressoras
   (cdp/api_cadastro_impressora.i) - so' os campos que a tela usa. */
DEFINE TEMP-TABLE tt_impressora NO-UNDO
    FIELD nome    AS CHARACTER
    FIELD caminho AS CHARACTER
    INDEX idx-nome nome.

DEFINE TEMP-TABLE tt_etiqueta NO-UNDO
    FIELD it_codigo     AS CHARACTER
    FIELD nr_ord_prod   AS INTEGER
    FIELD quantidade    AS DECIMAL
    FIELD qtd_etiquetas AS INTEGER.

DEFINE TEMP-TABLE tt_resultado NO-UNDO
    FIELD qtd_folhas AS INTEGER.

DEFINE TEMP-TABLE tt_retorno NO-UNDO
    FIELD cod_erro  AS INTEGER
    FIELD desc_erro AS CHARACTER FORMAT "x(256)".
