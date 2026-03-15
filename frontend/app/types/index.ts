export interface Question {
  id: number;
  question: string;
  reference_answer: string;
  max_score: number;
}

export interface Test {
  id: string;
  title: string;
  subject: string;
  questions: Question[];
  created_at: string;
}

export const AVAILABLE_CLASSES = [
  "8А", "8Б", "8В",
  "9А", "9Б", "9В",
  "10А", "10Б", "10В",
  "11А", "11Б", "11В",
];
