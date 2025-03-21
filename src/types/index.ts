export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  $id?: string;
  topic: string;
  text: string;
  options: string;
  parsedOptions?: Option[];
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  questionCount?: number;
}

export interface UserProgress {
  $id?: string;
  userId: string;
  questionId: string;
  correct: boolean;
  lastAttempted: Date | string;
  attemptsCount: number;
  consecutiveCorrect: number;
  masteryLevel: 'new' | 'learning' | 'review' | 'mastered';
}

export interface User {
  $id?: string;
  email: string;
  name?: string;
} 