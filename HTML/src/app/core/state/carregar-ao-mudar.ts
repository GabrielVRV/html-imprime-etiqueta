import { Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { PoNotificationService } from '@po-ui/ng-components';
import { EMPTY, Observable, Subject, catchError, map, merge, switchMap, tap } from 'rxjs';

export interface Carregamento<T> {
  dados: Signal<T | undefined>;
  carregando: Signal<boolean>;
  recarregar: () => void;
}

/**
 * Busca os dados sempre que o parâmetro muda (cancelando a busca anterior) e expõe
 * o resultado como signals. Falhas viram notificação e mantêm os dados anteriores.
 * Precisa ser chamado em contexto de injeção (construtor ou inicializador de campo).
 */
export function carregarAoMudar<P, T>(
  parametro: Signal<P>,
  buscar: (parametro: P) => Observable<T>,
): Carregamento<T> {
  const notification = inject(PoNotificationService);
  const dados = signal<T | undefined>(undefined);
  const carregando = signal(false);
  const recarga$ = new Subject<void>();

  merge(toObservable(parametro), recarga$.pipe(map(() => parametro())))
    .pipe(
      tap(() => carregando.set(true)),
      switchMap((valor) =>
        buscar(valor).pipe(
          catchError((erro: unknown) => {
            notification.error(erro instanceof Error ? erro.message : 'Erro inesperado.');
            carregando.set(false);
            return EMPTY;
          }),
        ),
      ),
      takeUntilDestroyed(),
    )
    .subscribe((resultado) => {
      dados.set(resultado);
      carregando.set(false);
    });

  return {
    dados: dados.asReadonly(),
    carregando: carregando.asReadonly(),
    recarregar: () => recarga$.next(),
  };
}

/** Variante sem parâmetro: busca ao criar e sempre que recarregar() for chamado. */
export function carregar<T>(buscar: () => Observable<T>): Carregamento<T> {
  return carregarAoMudar(signal(undefined), buscar);
}
