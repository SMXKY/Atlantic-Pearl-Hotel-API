import * as dotEnv from "dotenv";

import { app } from "./app";

dotEnv.config();

const port: Number = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`App is up and running on port: ${port}`);
});
