import 'dotenv/config';
import app from './app.js';
import { env } from './config/env.js';
const port = env.PORT;
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Credify backend listening on http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map