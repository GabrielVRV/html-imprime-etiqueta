import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PoProgressModule, PoProgressStatus } from '@po-ui/ng-components';

@Component({
  selector: 'app-progresso-separacao',
  imports: [PoProgressModule],
  template: `<po-progress [p-value]="percentual()" [p-status]="status()" [p-text]="texto()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressoSeparacaoComponent {
  readonly percentual = input.required<number>();

  protected readonly status = computed(() =>
    this.percentual() >= 100 ? PoProgressStatus.Success : PoProgressStatus.Default,
  );
  protected readonly texto = computed(() => `${this.percentual()}% atendido`);
}
