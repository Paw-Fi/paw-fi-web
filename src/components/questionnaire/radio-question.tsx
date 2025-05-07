'use client';

import type { Question } from '@/types/questions';
import { useQuestionnaire } from '@/contexts/questionnaire-context';
import RadioOption from '@/components/ui/radio-option';

interface RadioQuestionProps {
  question: Question;
}

function RadioQuestion({ question }: RadioQuestionProps) {
  const { state, setAnswer } = useQuestionnaire();
  const answer = state.answers[question.id] as string | undefined;
  
  const handleOptionChange = (optionId: string) => {
    setAnswer(question.id, optionId);
  };

  return (
    <div className="space-y-2">
      {question.options?.map((option) => (
        <RadioOption
          key={option.id}
          option={option}
          isSelected={answer === option.id}
          onChange={handleOptionChange}
        />
      ))}
    </div>
  );
}

export default RadioQuestion;
