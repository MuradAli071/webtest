import "dotenv/config";
import app from "./app.js";
import { initializeServer } from "./startup.js";

const port = Number(process.env.PORT ?? 5000);
await initializeServer();

app.listen(port, () => {
  console.log(`SUPERX API listening on port ${port}`);
});
