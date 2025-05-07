'use client';

import type { Question } from '@/types/questions';
import { useQuestionnaire } from '@/contexts/questionnaire-context';
import NumberInput from '@/components/ui/number-input';

interface NumberQuestionProps {
  question: Question;
}

function NumberQuestion({ question }: NumberQuestionProps) {
  const { state, setAnswer } = useQuestionnaire();
  const answer = state.answers[question.id] as number | undefined;
  
  const handleChange = (value: number) => {
    setAnswer(question.id, value);
  };

  return (
    <div className="w-full">
      <NumberInput
        value={answer}
        onChange={handleChange}
        placeholder={question.placeholder}
        min={question.min}
        max={question.max}
      />
    </div>
  );
}

export default NumberQuestion;
