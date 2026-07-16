export abstract class DomainEvent {
  public readonly occurredAt: Date = new Date();
  public readonly eventId: string = crypto.randomUUID();

  constructor(public readonly type: string) {}
}

export interface DomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void> | void;
}

export abstract class Entity<T extends { id: string }> {
  protected constructor(public readonly props: T) {}

  get id(): string {
    return this.props.id;
  }

  equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    return this.id === other.id;
  }
}

export abstract class ValueObject<T> {
  protected constructor(public readonly props: T) {}

  equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}

export abstract class AggregateRoot<T extends { id: string; version: number }> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): readonly DomainEvent[] {
    return this._domainEvents;
  }

  protected addEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearEvents(): void {
    this._domainEvents = [];
  }

  protected incrementVersion(): void {
    this.props.version += 1;
  }
}

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ===== 领域服务接口 =====

export interface RandomService {
  next(): number;
  nextInt(max: number): number;
  nextRange(min: number, max: number): number;
}