/* =========================================================
   api_imprime_etiqueta.p
   API REST da tela de impressao de etiquetas de separacao
   (substitui o uso manual da ESCP1001)
   Projeto: Imprime Etiqueta | Logistica CASP | OpenEdge 12.8

   Base: /api/cpp/v1/api_imprime_etiqueta/
   Todas as rotas recebem e devolvem JSON. Erros de negocio voltam
   com HTTP 200 e cod_erro <> 0 em tt_retorno.
   ========================================================= */

{utp/ut-api.i}

{utp/ut-api-action.i pi-pedidos     POST /pedidos/     }
{utp/ut-api-action.i pi-pedido      POST /pedido/      }
{utp/ut-api-action.i pi-ordem       POST /ordem/       }
{utp/ut-api-action.i pi-impressoras POST /impressoras/ }
{utp/ut-api-action.i pi-imprimir    POST /imprimir/    }

{utp/ut-api-notfound.i}

{include/api_imprime_etiqueta.i}

DEFINE VARIABLE hRegras AS HANDLE NO-UNDO.


PROCEDURE pi-pedidos:
    DEFINE INPUT  PARAMETER jsonInput  AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE OUTPUT PARAMETER jsonOutput AS Progress.Json.ObjectModel.JsonObject NO-UNDO.

    DEFINE VARIABLE oPayload AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE VARIABLE cBusca   AS CHARACTER NO-UNDO.
    DEFINE VARIABLE iPagina  AS INTEGER   NO-UNDO.
    DEFINE VARIABLE iTamanho AS INTEGER   NO-UNDO.
    DEFINE VARIABLE lTemMais AS LOGICAL   NO-UNDO.

    RUN pi-inicia (INPUT jsonInput, OUTPUT jsonOutput, OUTPUT oPayload).

    IF oPayload:Has("busca")   THEN cBusca   = oPayload:GetCharacter("busca").
    IF oPayload:Has("pagina")  THEN iPagina  = oPayload:GetInteger("pagina").
    IF oPayload:Has("tamanho") THEN iTamanho = oPayload:GetInteger("tamanho").

    RUN pi-listar-pedidos IN hRegras (INPUT  cBusca,
                                       INPUT  iPagina,
                                       INPUT  iTamanho,
                                       OUTPUT TABLE tt_pedido,
                                       OUTPUT lTemMais).

    EMPTY TEMP-TABLE tt_pagina.
    CREATE tt_pagina.
    tt_pagina.tem_mais = lTemMais.

    RUN pi-adiciona-tabela (jsonOutput, TEMP-TABLE tt_pedido:HANDLE).
    RUN pi-adiciona-tabela (jsonOutput, TEMP-TABLE tt_pagina:HANDLE).

    CATCH eErro AS Progress.Lang.Error:
        RUN pi-registra-erro (eErro).
    END CATCH.
    FINALLY:
        RUN pi-finaliza (jsonOutput).
    END FINALLY.
END PROCEDURE.


PROCEDURE pi-pedido:
    DEFINE INPUT  PARAMETER jsonInput  AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE OUTPUT PARAMETER jsonOutput AS Progress.Json.ObjectModel.JsonObject NO-UNDO.

    DEFINE VARIABLE oPayload  AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE VARIABLE iNrPedido AS INTEGER NO-UNDO.

    RUN pi-inicia (INPUT jsonInput, OUTPUT jsonOutput, OUTPUT oPayload).

    IF oPayload:Has("nr_pedido") THEN
        iNrPedido = oPayload:GetInteger("nr_pedido").

    RUN pi-obter-pedido IN hRegras (INPUT  iNrPedido,
                                     OUTPUT TABLE tt_pedido,
                                     OUTPUT TABLE tt_ordem).
    RUN pi-adiciona-tabela (jsonOutput, TEMP-TABLE tt_pedido:HANDLE).
    RUN pi-adiciona-tabela (jsonOutput, TEMP-TABLE tt_ordem:HANDLE).

    CATCH eErro AS Progress.Lang.Error:
        RUN pi-registra-erro (eErro).
    END CATCH.
    FINALLY:
        RUN pi-finaliza (jsonOutput).
    END FINALLY.
END PROCEDURE.


PROCEDURE pi-ordem:
    DEFINE INPUT  PARAMETER jsonInput  AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE OUTPUT PARAMETER jsonOutput AS Progress.Json.ObjectModel.JsonObject NO-UNDO.

    DEFINE VARIABLE oPayload   AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE VARIABLE iNrPedido  AS INTEGER NO-UNDO.
    DEFINE VARIABLE iNrOrdProd AS INTEGER NO-UNDO.

    RUN pi-inicia (INPUT jsonInput, OUTPUT jsonOutput, OUTPUT oPayload).

    IF oPayload:Has("nr_pedido") THEN
        iNrPedido = oPayload:GetInteger("nr_pedido").
    IF oPayload:Has("nr_ord_prod") THEN
        iNrOrdProd = oPayload:GetInteger("nr_ord_prod").

    RUN pi-obter-ordem IN hRegras (INPUT  iNrPedido,
                                    INPUT  iNrOrdProd,
                                    OUTPUT TABLE tt_ordem,
                                    OUTPUT TABLE tt_item).
    RUN pi-adiciona-tabela (jsonOutput, TEMP-TABLE tt_ordem:HANDLE).
    RUN pi-adiciona-tabela (jsonOutput, TEMP-TABLE tt_item:HANDLE).

    CATCH eErro AS Progress.Lang.Error:
        RUN pi-registra-erro (eErro).
    END CATCH.
    FINALLY:
        RUN pi-finaliza (jsonOutput).
    END FINALLY.
END PROCEDURE.


PROCEDURE pi-impressoras:
    DEFINE INPUT  PARAMETER jsonInput  AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE OUTPUT PARAMETER jsonOutput AS Progress.Json.ObjectModel.JsonObject NO-UNDO.

    DEFINE VARIABLE oPayload AS Progress.Json.ObjectModel.JsonObject NO-UNDO.

    RUN pi-inicia (INPUT jsonInput, OUTPUT jsonOutput, OUTPUT oPayload).

    RUN pi-listar-impressoras IN hRegras (OUTPUT TABLE tt_impressora).
    RUN pi-adiciona-tabela (jsonOutput, TEMP-TABLE tt_impressora:HANDLE).

    CATCH eErro AS Progress.Lang.Error:
        RUN pi-registra-erro (eErro).
    END CATCH.
    FINALLY:
        RUN pi-finaliza (jsonOutput).
    END FINALLY.
END PROCEDURE.


PROCEDURE pi-imprimir:
    DEFINE INPUT  PARAMETER jsonInput  AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE OUTPUT PARAMETER jsonOutput AS Progress.Json.ObjectModel.JsonObject NO-UNDO.

    DEFINE VARIABLE oPayload    AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE VARIABLE cImpressora AS CHARACTER NO-UNDO.
    DEFINE VARIABLE cLote       AS CHARACTER NO-UNDO.
    DEFINE VARIABLE cSerie      AS CHARACTER NO-UNDO.

    RUN pi-inicia (INPUT jsonInput, OUTPUT jsonOutput, OUTPUT oPayload).

    IF oPayload:Has("impressora") THEN cImpressora = TRIM(oPayload:GetCharacter("impressora")).
    IF oPayload:Has("lote")       THEN cLote       = TRIM(oPayload:GetCharacter("lote")).
    IF oPayload:Has("serie")      THEN cSerie      = TRIM(oPayload:GetCharacter("serie")).

    EMPTY TEMP-TABLE tt_etiqueta.
    IF oPayload:Has("tt_etiqueta") THEN
        TEMP-TABLE tt_etiqueta:READ-JSON("JsonArray", oPayload:GetJsonArray("tt_etiqueta"), "EMPTY").

    RUN pi-imprimir IN hRegras (INPUT  cImpressora,
                                 INPUT  cLote,
                                 INPUT  cSerie,
                                 INPUT  TABLE tt_etiqueta,
                                 OUTPUT TABLE tt_resultado).
    RUN pi-adiciona-tabela (jsonOutput, TEMP-TABLE tt_resultado:HANDLE).

    CATCH eErro AS Progress.Lang.Error:
        RUN pi-registra-erro (eErro).
    END CATCH.
    FINALLY:
        RUN pi-finaliza (jsonOutput).
    END FINALLY.
END PROCEDURE.


/* ---------------------------------------------------------
   Infraestrutura comum das rotas
   --------------------------------------------------------- */

/* O ut-api.i entrega o envelope inteiro da requisicao; o corpo do POST
   fica em "payload". Sem corpo, devolve um objeto vazio para as rotas
   nao precisarem testar VALID-OBJECT. */
PROCEDURE pi-inicia PRIVATE:
    DEFINE INPUT  PARAMETER jsonInput  AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE OUTPUT PARAMETER jsonOutput AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE OUTPUT PARAMETER oPayload   AS Progress.Json.ObjectModel.JsonObject NO-UNDO.

    EMPTY TEMP-TABLE tt_retorno.
    jsonOutput = NEW Progress.Json.ObjectModel.JsonObject().

    IF VALID-OBJECT(jsonInput) AND jsonInput:Has("payload") THEN
        oPayload = jsonInput:GetJsonObject("payload").
    ELSE
        oPayload = NEW Progress.Json.ObjectModel.JsonObject().

    RUN cpp/api_imprime_etiquetarp.p PERSISTENT SET hRegras.
END PROCEDURE.

PROCEDURE pi-adiciona-tabela PRIVATE:
    DEFINE INPUT PARAMETER jsonOutput AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    DEFINE INPUT PARAMETER hTabela    AS HANDLE NO-UNDO.

    DEFINE VARIABLE jsonArray AS Progress.Json.ObjectModel.JsonArray NO-UNDO.

    jsonArray = NEW Progress.Json.ObjectModel.JsonArray().
    jsonArray:READ(hTabela).
    jsonOutput:Add(hTabela:NAME, jsonArray).
END PROCEDURE.

PROCEDURE pi-registra-erro PRIVATE:
    DEFINE INPUT PARAMETER eErro AS Progress.Lang.Error NO-UNDO.

    DEFINE VARIABLE cMensagem AS CHARACTER NO-UNDO.

    cMensagem = IF TYPE-OF(eErro, Progress.Lang.AppError)
                   AND CAST(eErro, Progress.Lang.AppError):ReturnValue <> ""
                THEN CAST(eErro, Progress.Lang.AppError):ReturnValue
                ELSE eErro:GetMessage(1).

    EMPTY TEMP-TABLE tt_retorno.
    CREATE tt_retorno.
    ASSIGN tt_retorno.cod_erro  = -1
           tt_retorno.desc_erro = cMensagem.
END PROCEDURE.

PROCEDURE pi-finaliza PRIVATE:
    DEFINE INPUT PARAMETER jsonOutput AS Progress.Json.ObjectModel.JsonObject NO-UNDO.

    IF NOT CAN-FIND(FIRST tt_retorno) THEN DO:
        CREATE tt_retorno.
        ASSIGN tt_retorno.cod_erro  = 0
               tt_retorno.desc_erro = "OK".
    END.

    IF VALID-OBJECT(jsonOutput) THEN
        RUN pi-adiciona-tabela (jsonOutput, TEMP-TABLE tt_retorno:HANDLE).

    IF VALID-HANDLE(hRegras) THEN
        DELETE PROCEDURE hRegras.
END PROCEDURE.
