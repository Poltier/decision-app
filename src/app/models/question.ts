export interface QuestionOption {
    text: string;
    isCorrect: boolean;
}
  
  export interface Question {
    id?: string;
    questionText: string;
    imageUrl: string;
    options: QuestionOption[];
}