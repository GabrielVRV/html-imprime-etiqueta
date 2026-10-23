import { BreakpointObserver } from '@angular/cdk/layout';
import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/** Celular ou tablet em pé: as tabelas mostram só as colunas essenciais. */
const CONSULTA_TELA_PEQUENA = '(max-width: 767.98px)';

export function telaPequena(): Signal<boolean> {
  const breakpoint = inject(BreakpointObserver);
  return toSignal(breakpoint.observe(CONSULTA_TELA_PEQUENA).pipe(map((estado) => estado.matches)), {
    initialValue: breakpoint.isMatched(CONSULTA_TELA_PEQUENA),
  });
}
