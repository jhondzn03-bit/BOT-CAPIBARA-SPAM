/**
 * Limitador de velocidad simple en memoria.
 * Protege contra envíos excesivos y reduce el riesgo de bloqueo de la cuenta.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  /**
   * Registra un evento y devuelve true si está dentro del límite.
   * @param key identificador (ej. JID del grupo)
   * @param max número máximo de eventos
   * @param windowMs ventana de tiempo en ms
   */
  check(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length >= max) {
      this.hits.set(key, list);
      return false;
    }
    list.push(now);
    this.hits.set(key, list);
    return true;
  }

  /** Devuelve cuántos eventos quedan en la ventana actual. */
  remaining(key: string, max: number, windowMs: number): number {
    const now = Date.now();
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    return Math.max(0, max - list.length);
  }

  /** Tiempo restante (ms) hasta que se libere el próximo cupo. */
  retryAfter(key: string, max: number, windowMs: number): number {
    const list = (this.hits.get(key) ?? []).filter((t) => Date.now() - t < windowMs);
    if (list.length < max) return 0;
    return Math.max(0, windowMs - (Date.now() - list[0]));
  }

  reset(key?: string): void {
    if (key) this.hits.delete(key);
    else this.hits.clear();
  }
}

export const globalLimiter = new RateLimiter();
