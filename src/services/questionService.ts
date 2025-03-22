import { databases, appwriteConfig, ID, Query } from '@/lib/appwrite';
import { Question, Option } from '@/types';

export const questionService = {
  // Get all questions
  async getAllQuestions(): Promise<Question[]> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionCollectionId
      );
      
      // Parse options strings to objects
      const questions = response.documents as unknown as Question[];
      return questions.map(question => this.parseQuestionOptions(question));
    } catch (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
  },

  // Get questions by topic
  async getQuestionsByTopic(topic: string): Promise<Question[]> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionCollectionId,
        [Query.equal('topic', topic)]
      );
      
      // Parse options strings to objects
      const questions = response.documents as unknown as Question[];
      return questions.map(question => this.parseQuestionOptions(question));
    } catch (error) {
      console.error(`Error fetching questions for topic ${topic}:`, error);
      return [];
    }
  },

  // Get a single question by ID
  async getQuestionById(id: string): Promise<Question | null> {
    try {
      const response = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.questionCollectionId,
        id
      );
      
      // Parse options string to object
      const question = response as unknown as Question;
      return this.parseQuestionOptions(question);
    } catch (error) {
      console.error(`Error fetching question with ID ${id}:`, error);
      return null;
    }
  },

  // Create a new question
  async createQuestion(question: Omit<Question, '$id'>): Promise<Question | null> {
    try {
      // If options is an array, stringify it before sending to Appwrite
      const questionToSave = this.prepareQuestionForSave(question);
      
      const response = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.questionCollectionId,
        ID.unique(),
        questionToSave
      );
      
      // Parse the response for client use
      const createdQuestion = response as unknown as Question;
      return this.parseQuestionOptions(createdQuestion);
    } catch (error) {
      console.error('Error creating question:', error);
      return null;
    }
  },

  // Update an existing question
  async updateQuestion(id: string, question: Partial<Question>): Promise<Question | null> {
    try {
      // If options is provided as an array, stringify it
      const questionToSave = this.prepareQuestionForUpdate(question);
      
      const response = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.questionCollectionId,
        id,
        questionToSave
      );
      
      // Parse the response for client use
      const updatedQuestion = response as unknown as Question;
      return this.parseQuestionOptions(updatedQuestion);
    } catch (error) {
      console.error(`Error updating question with ID ${id}:`, error);
      return null;
    }
  },

  // Delete a question
  async deleteQuestion(id: string): Promise<boolean> {
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.questionCollectionId,
        id
      );
      return true;
    } catch (error) {
      console.error(`Error deleting question with ID ${id}:`, error);
      return false;
    }
  },

  // Helper method to parse options from string to array
  parseQuestionOptions(question: Question): Question {
    try {
      if (question.options && typeof question.options === 'string') {
        question.parsedOptions = JSON.parse(question.options) as Option[];
      }
      return question;
    } catch (error) {
      console.error('Error parsing question options:', error);
      question.parsedOptions = [];
      return question;
    }
  },

  // Helper method to prepare question for saving (stringify options if needed)
  prepareQuestionForSave(question: Omit<Question, '$id'>): Omit<Question, '$id'> {
    // Create a copy to avoid modifying the original
    const questionCopy = { ...question };
    
    // If parsedOptions exists, stringify them and assign to options
    if (questionCopy.parsedOptions) {
      questionCopy.options = JSON.stringify(questionCopy.parsedOptions);
      delete questionCopy.parsedOptions;
    } 
    // If options is already a string, keep it as is
    else if (typeof questionCopy.options !== 'string') {
      // This handles the case where options might be passed as an array directly
      questionCopy.options = JSON.stringify(questionCopy.options);
    }
    
    return questionCopy;
  },

  // Helper method to prepare question for updating (stringify options if needed)
  prepareQuestionForUpdate(question: Partial<Question>): Partial<Question> {
    // Create a copy to avoid modifying the original
    const questionCopy = { ...question };
    
    // If parsedOptions exists, stringify them and assign to options
    if (questionCopy.parsedOptions) {
      questionCopy.options = JSON.stringify(questionCopy.parsedOptions);
      delete questionCopy.parsedOptions;
    } 
    // If options is already a string, keep it as is
    else if (questionCopy.options && typeof questionCopy.options !== 'string') {
      // This handles the case where options might be passed as an array directly
      questionCopy.options = JSON.stringify(questionCopy.options);
    }
    
    return questionCopy;
  },

  // Create multiple questions at once
  async createBulkQuestions(questions: Array<{
    text: string;
    options: Option[];
    explanation: string;
    topicId: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>): Promise<boolean> {
    try {
      // Process questions in batches to avoid overwhelming the API
      const batchSize = 10;
      const totalQuestions = questions.length;
      
      for (let i = 0; i < totalQuestions; i += batchSize) {
        const batch = questions.slice(i, Math.min(i + batchSize, totalQuestions));
        
        // Create promises for each question in the batch
        const promises = batch.map(q => {
          return this.createQuestion({
            text: q.text,
            options: JSON.stringify(q.options),
            explanation: q.explanation || '',
            topic: q.topicId,
            difficulty: q.difficulty
          });
        });
        
        // Wait for all promises in this batch to resolve
        await Promise.all(promises);
      }
      
      return true;
    } catch (error) {
      console.error('Error creating bulk questions:', error);
      throw error; // Re-throw to handle in the calling function
    }
  }
}; 