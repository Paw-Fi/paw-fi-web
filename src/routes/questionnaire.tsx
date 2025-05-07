import { createFileRoute } from "@tanstack/react-router";
import QuestionContainer from "../components/questionnaire/question-container";

export const Route = createFileRoute("/questionnaire")({
  component: Questionnaire,
});

function Questionnaire() {
  return <QuestionContainer />;
}
