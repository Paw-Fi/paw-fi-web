import { withCors } from "../shared/cors.ts";
import { handleWalletTransferMutation } from "../shared/wallet-transfer-mutation.ts";

Deno.serve(
  withCors((req: Request) => handleWalletTransferMutation(req, "delete")),
);
