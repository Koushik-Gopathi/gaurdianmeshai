/**
 * Minimal ambient typing for the `pg` package.
 *
 * The `pg` package does not ship its own TypeScript types and `@types/pg`
 * is not installed in this project. We only use a tiny slice of the API
 * (Pool + query), so we declare just enough surface here rather than
 * pulling in a new dependency.
 */
declare module 'pg' {
  export interface QueryResultRow {
    [column: string]: any;
  }

  export interface QueryResult<R extends QueryResultRow = any> {
    rows: R[];
    rowCount: number | null;
  }

  export interface PoolConfig {
    connectionString?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    ssl?: boolean | { rejectUnauthorized?: boolean };
  }

  export class Pool {
    constructor(config?: PoolConfig);
    query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>>;
    end(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}
