'use client';

import type { Question } from '@/types/questions';
import { useQuestionnaire } from '@/contexts/questionnaire-context';
import CheckboxOption from '@/components/ui/checkbox-option';

interface CheckboxQuestionProps {
  question: Question;
}

function CheckboxQuestion({ question }: CheckboxQuestionProps) {
  const { state, setAnswer } = useQuestionnaire();
  const answer = (state.answers[question.id] as Array<string> | undefined) || [];
  
  const handleOptionChange = (optionId: string) => {
    const newAnswer = answer.includes(optionId)
      ? answer.filter(id => id !== optionId)
      : [...answer, optionId];
    
    setAnswer(question.id, newAnswer);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {question.options?.map((option) => (
        <CheckboxOption
          key={option.id}
          option={option}
          isSelected={answer.includes(option.id)}
          onChange={handleOptionChange}
        />
      ))}
    </div>
  );
}

export default CheckboxQuestion;
