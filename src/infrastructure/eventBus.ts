import type { DomainEvent } from '@/domains/shared/kernel';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

export interface EventSubscription {
  unsubscribe(): void;
}

export class DomainEventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private globalHandlers: EventHandler[] = [];

  subscribe<T extends DomainEvent>(type: T['type'], handler: EventHandler<T>): EventSubscription {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EventHandler);

    return {
      unsubscribe: () => {
        this.handlers.get(type)?.delete(handler as EventHandler);
      },
    };
  }

  subscribeAll(handler: EventHandler): EventSubscription {
    this.globalHandlers.push(handler);
    return {
      unsubscribe: () => {
        const idx = this.globalHandlers.indexOf(handler);
        if (idx >= 0) this.globalHandlers.splice(idx, 1);
      },
    };
  }

  async publish(event: DomainEvent): Promise<void> {
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      await Promise.all(
        Array.from(typeHandlers).map(h => 
          Promise.resolve(h(event)).catch(err => console.error(`[EventBus] Handler error for ${event.type}:`, err))
        )
      );
    }

    await Promise.all(
      this.globalHandlers.map(h =>
        Promise.resolve(h(event)).catch(err => console.error('[EventBus] Global handler error:', err))
      )
    );
  }

  clear(): void {
    this.handlers.clear();
    this.globalHandlers = [];
  }
}

export const domainEventBus = new DomainEventBus();