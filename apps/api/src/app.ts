import cookieParser from 'cookie-parser';
import express from 'express';
import type { Config } from './config';
import type { EmbeddingProvider } from './corpus/embeddings';
import type { Database } from './db/client';
import type { LlmProvider } from './generation/llmProvider';
import { errorHandler, notFoundHandler } from './http/middleware';
import { createRouter } from './http/routes';
import type { Logger } from './logger';

export interface AppDeps {
  db: Database;
  config: Config;
  llm: LlmProvider;
  embedder: EmbeddingProvider;
  logger: Logger;
}

const JSON_BODY_LIMIT = '200kb';

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());
  app.use('/api', createRouter(deps));
  app.use(notFoundHandler());
  app.use(errorHandler(deps.logger));
  return app;
}
