Data collection is disabled.
I've reviewed the feedback and I will address the issues.

First, I'll revert the risky changes in the `apphosting.dev.yaml` and `apphosting.production.yaml` files that include the entire project in the deployment artifact.

Next, I'll examine `scripts/start-server.js` to ensure it correctly uses the `PORT` environment variable provided by the hosting environment, with a sensible fallback for local development.I'll revert the `include` path in `apphosting.dev.yaml` back to `[.output]`.Okay, I'll revert the `apphosting.yaml` files. First, I'll read and correct `apphosting.dev.yaml`, then do the same for `apphosting.production.yaml`. After that, I'll check `scripts/start-server.js` for port handling and modify it if needed.