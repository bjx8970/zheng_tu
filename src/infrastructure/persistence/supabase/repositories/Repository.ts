export interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: ID): Promise<void>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface QueryableRepository<T, ID> extends Repository<T, ID> {
  findAll(options?: QueryOptions): Promise<T[]>;
  findBy(criteria: Partial<T>, options?: QueryOptions): Promise<T[]>;
  count(criteria?: Partial<T>): Promise<number>;
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class OptimisticLockError extends RepositoryError {
  constructor(entityId: string) {
    super(`Optimistic lock failed for ${entityId}`, 'OPTIMISTIC_LOCK');
    this.name = 'OptimisticLockError';
  }
}

export class NotFoundError extends RepositoryError {
  constructor(entityType: string, id: string) {
    super(`${entityType} not found: ${id}`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}