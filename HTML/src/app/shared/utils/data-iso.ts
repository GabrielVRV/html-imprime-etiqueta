/** Data local no formato yyyy-mm-dd, sem o deslocamento de fuso do toISOString(). */
export function dataIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function paraIso(data: string | Date): string {
  return typeof data === 'string' ? data.slice(0, 10) : dataIso(data);
}

export function hojeMaisDias(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return dataIso(data);
}
