import { createFileRoute } from "@tanstack/react-router";
import GetStarted from "./index";

export const Route = createFileRoute("/get-started")({
  component: GetStarted,
});
