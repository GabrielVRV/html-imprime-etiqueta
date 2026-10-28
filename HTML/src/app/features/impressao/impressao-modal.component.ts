import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  PoFieldModule,
  PoModalAction,
  PoModalComponent,
  PoModalModule,
  PoNotificationService,
  PoSelectOption,
} from '@po-ui/ng-components';
import { finalize, map, startWith } from 'rxjs';

import { PreferenciasService } from '../../core/preferencias/preferencias.service';
import { EtiquetaSolicitada, ItemSeparacao } from '../../domain/models';
import { ImpressaoRepository } from '../../domain/repositories/impressao.repository';
import {
  ETIQUETAS_POR_FOLHA,
  folhasNecessarias,
  quantidadeEtiquetasValida,
  sugerirEtiqueta,
} from '../../domain/rules/etiqueta.rules';

type EtiquetaForm = FormGroup<{
  quantidadePorEtiqueta: FormControl<number>;
  quantidadeEtiquetas: FormControl<number>;
}>;

const MAXIMO_ETIQUETAS_POR_ITEM = 998;

const etiquetasPorFolhaInteira: ValidatorFn = (controle) =>
  quantidadeEtiquetasValida(controle.value) ? null : { folhaIncompleta: true };

@Component({
  selector: 'app-impressao-modal',
  imports: [DecimalPipe, ReactiveFormsModule, PoModalModule, PoFieldModule],
  templateUrl: './impressao-modal.component.html',
  styleUrl: './impressao-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImpressaoModalComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly repository = inject(ImpressaoRepository);
  private readonly notification = inject(PoNotificationService);
  private readonly preferencias = inject(PreferenciasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly modal = viewChild.required(PoModalComponent);

  readonly itens = input.required<ItemSeparacao[]>();
  readonly nrOrdProd = input.required<number>();

  /** Itens congelados ao abrir, para a lista não mudar se a seleção da tabela mudar. */
  protected readonly itensEmEdicao = signal<ItemSeparacao[]>([]);
  protected readonly opcoesImpressora = signal<PoSelectOption[]>([]);
  private readonly enviando = signal(false);

  protected readonly form = this.fb.group({
    impressora: ['', Validators.required],
    lote: [''],
    serie: [''],
    etiquetas: this.fb.array<EtiquetaForm>([]),
  });

  private readonly formValido = toSignal(
    this.form.statusChanges.pipe(map((status) => status === 'VALID')),
    { initialValue: false },
  );
  private readonly valores = toSignal(
    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      map(() => this.form.getRawValue()),
    ),
    { requireSync: true },
  );

  protected readonly resumo = computed(() => {
    const quantidades = this.valores().etiquetas.map((e) => e.quantidadeEtiquetas || 0);
    return {
      folhas: quantidades.reduce((total, qtd) => total + folhasNecessarias(qtd), 0),
      etiquetas: quantidades.reduce((total, qtd) => total + qtd, 0),
    };
  });

  protected readonly acaoImprimir = computed<PoModalAction>(() => ({
    label: 'Enviar para impressão',
    action: () => this.imprimir(),
    disabled: !this.formValido() || this.enviando(),
    loading: this.enviando(),
  }));

  protected readonly acaoCancelar: PoModalAction = {
    label: 'Cancelar',
    action: () => this.modal().close(),
  };

  protected readonly maximoEtiquetas = MAXIMO_ETIQUETAS_POR_ITEM;
  protected readonly etiquetasPorFolha = ETIQUETAS_POR_FOLHA;

  constructor() {
    this.repository
      .listarImpressoras()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (impressoras) => {
          this.opcoesImpressora.set(
            impressoras.map(({ nome, caminho }) => ({ label: nome, value: caminho })),
          );
          this.selecionarImpressoraPadrao();
        },
        error: (erro: Error) => this.notification.error(erro.message),
      });
  }

  protected get etiquetas(): FormArray<EtiquetaForm> {
    return this.form.controls.etiquetas;
  }

  abrir(): void {
    const itens = this.itens();
    this.itensEmEdicao.set(itens);
    this.etiquetas.clear({ emitEvent: false });
    itens
      .map((item) => sugerirEtiqueta(item, this.nrOrdProd()))
      .forEach((sugestao) => this.etiquetas.push(this.criarLinha(sugestao), { emitEvent: false }));
    this.form.updateValueAndValidity();
    this.modal().open();
  }

  private criarLinha(sugestao: EtiquetaSolicitada): EtiquetaForm {
    return this.fb.group({
      quantidadePorEtiqueta: [
        sugestao.quantidadePorEtiqueta,
        [Validators.required, Validators.min(0.0001)],
      ],
      quantidadeEtiquetas: [
        sugestao.quantidadeEtiquetas,
        [Validators.required, Validators.max(MAXIMO_ETIQUETAS_POR_ITEM), etiquetasPorFolhaInteira],
      ],
    });
  }

  private selecionarImpressoraPadrao(): void {
    const caminhos = this.opcoesImpressora().map((opcao) => opcao.value);
    const ultima = this.preferencias.ultimaImpressora;
    const padrao = ultima && caminhos.includes(ultima) ? ultima : caminhos[0];
    if (padrao) this.form.controls.impressora.setValue(String(padrao));
  }

  private imprimir(): void {
    if (this.form.invalid) return;

    const { impressora, lote, serie, etiquetas } = this.form.getRawValue();
    const solicitacao = {
      impressora,
      lote: lote.trim(),
      serie: serie.trim(),
      etiquetas: this.itensEmEdicao().map((item, indice) => ({
        itCodigo: item.itCodigo,
        nrOrdProd: this.nrOrdProd(),
        ...etiquetas[indice],
      })),
    };

    this.enviando.set(true);
    this.repository
      .imprimir(solicitacao)
      .pipe(
        finalize(() => this.enviando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ folhasEnviadas }) => {
          this.preferencias.ultimaImpressora = impressora;
          this.notification.success(
            `${folhasEnviadas} folha(s) enviada(s) para a fila de impressão.`,
          );
          this.modal().close();
        },
        error: (erro: Error) => this.notification.error(erro.message),
      });
  }
}
