import { createApp } from './app';
import { config } from './lib/env';

const app = createApp();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`AI Media Buyer API running on port ${config.port} (${config.nodeEnv})`);
});

