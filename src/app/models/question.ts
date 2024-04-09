export interface QuestionOption {
    text: string;
  isCorrect: boolean;
    selected?: boolean;
    correct?: boolean;
}
  
  export interface Question {
    id?: string;
    questionText: string;
    imageUrl: string;
    options: QuestionOption[];
}