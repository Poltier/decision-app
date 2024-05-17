export interface Question {
  id?: string;
  questionText: string;
  imageUrl?: string;
  options: QuestionOption[];
  approved: boolean;
  thematic?: string;
  index?: number;
}

export interface QuestionOption {
  text: string;
  isCorrect: boolean;
  selected?: boolean;
  correct?: boolean;
}