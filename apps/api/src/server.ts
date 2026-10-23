import { createApp } from './app';
import { loadConfig } from './config';
import { createDatabase } from './db/client';
import { createLogger } from './logger';
import { createProviders } from './providers';

const config = loadConfig();
const logger = createLogger(config.NODE_ENV === 'production' ? 'info' : 'debug');
const { db } = createDatabase(config.DATABASE_URL);
const { llm, embedder } = createProviders(config);

createApp({ db, config, llm, embedder, logger }).listen(config.PORT, () => {
  logger.info(
    { port: config.PORT, llm: `${llm.name}/${llm.model}`, embeddings: embedder.model },
    'curriculum hub api listening',
  );
});
