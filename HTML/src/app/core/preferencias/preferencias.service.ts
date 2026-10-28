import { Injectable } from '@angular/core';

const CHAVE_IMPRESSORA = 'imprime-etiqueta.impressora';

/** Conveniências por usuário guardadas no navegador; falhas de storage são ignoradas. */
@Injectable({ providedIn: 'root' })
export class PreferenciasService {
  get ultimaImpressora(): string | null {
    try {
      return localStorage.getItem(CHAVE_IMPRESSORA);
    } catch {
      return null;
    }
  }

  set ultimaImpressora(caminho: string) {
    try {
      localStorage.setItem(CHAVE_IMPRESSORA, caminho);
    } catch {
      // storage bloqueado (modo privado, política do navegador): só não lembra a escolha
    }
  }
}
