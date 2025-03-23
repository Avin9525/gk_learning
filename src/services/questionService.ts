import { databases, appwriteConfig, ID, Query } from '@/lib/appwrite';
import { Question, Option } from '@/types';

export const questionService = {
  // Get all questions
  async getAllQuestions(): Promise<Question[]> {
    try {
      console.log('Fetching all questions from Appwrite...');
      console.log('Database ID:', appwriteConfig.databaseId);
      console.log('Question Collection ID:', appwriteConfig.questionCollectionId);
      
      // Fetch all questions with pagination
      let allDocuments: any[] = [];
      let offset = 0;
      const limit = 100; // Maximum limit per page in Appwrite
      let hasMore = true;
      
      while (hasMore) {
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.questionCollectionId,
          [Query.limit(limit), Query.offset(offset)]
        );
        
        allDocuments = [...allDocuments, ...response.documents];
        
        // Check if there are more documents to fetch
        if (response.documents.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
      
      console.log(`Retrieved ${allDocuments.length} questions total`);
      if (allDocuments.length > 0) {
        console.log('First question:', {
          id: allDocuments[0].$id,
          text: allDocuments[0].text?.substring(0, 30) + '...',
          topic: allDocuments[0].topic
        });
      }
      
      // Parse options strings to objects
      const questions = allDocuments as unknown as Question[];
      return questions.map(question => this.parseQuestionOptions(question));
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      if (error.message) {
        console.error('Error message:', error.message);
      }
      if (error.response) {
        console.error('Error response:', error.response);
      }
      return [];
    }
  },

  // Get questions by topic
  async getQuestionsByTopic(topic: string): Promise<Question[]> {
    try {
      console.log(`Fetching questions for topic: ${topic}`);
      console.log('Database ID:', appwriteConfig.databaseId);
      console.log('Question Collection ID:', appwriteConfig.questionCollectionId);
      
      // Fetch topic questions with pagination
      let allDocuments: any[] = [];
      let offset = 0;
      const limit = 100; // Maximum limit per page in Appwrite
      let hasMore = true;
      
      while (hasMore) {
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.questionCollectionId,
          [Query.equal('topic', topic), Query.limit(limit), Query.offset(offset)]
        );
        
        allDocuments = [...allDocuments, ...response.documents];
        
        // Check if there are more documents to fetch
        if (response.documents.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
      
      console.log(`Retrieved ${allDocuments.length} questions for topic ${topic}`);
      
      // Parse options strings to objects
      const questions = allDocuments as unknown as Question[];
      return questions.map(question => this.parseQuestionOptions(question));
    } catch (error: any) {
      console.error(`Error fetching questions for topic ${topic}:`, error);
      if (error.message) {
        console.error('Error message:', error.message);
      }
      if (error.response) {
        console.error('Error response:', error.response);
      }
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
      // Log the question being created
      console.log('Creating question with topic:', question.topic);
      
      // If options is an array, stringify it before sending to Appwrite
      const questionToSave = this.prepareQuestionForSave(question);
      
      // Ensure the topic field is correctly set
      if (!questionToSave.topic) {
        console.error('Topic is missing when creating question');
        throw new Error('Topic is required when creating a question');
      }
      
      const response = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.questionCollectionId,
        ID.unique(),
        questionToSave
      );
      
      // Log the created question response
      console.log('Question created successfully with ID:', response.$id);
      
      // Parse the response for client use
      const createdQuestion = response as unknown as Question;
      return this.parseQuestionOptions(createdQuestion);
    } catch (error) {
      console.error('Error creating question:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
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
        let parsedOptions = JSON.parse(question.options) as Option[];
        
        // Normalize option IDs to ensure they're in the correct format (numeric strings)
        parsedOptions = parsedOptions.map((opt, index) => {
          // If the ID is in the format "option-X", convert it to a numeric ID
          if (opt.id && opt.id.startsWith('option-')) {
            return {
              ...opt,
              id: String(index + 1)
            };
          }
          return opt;
        });
        
        question.parsedOptions = parsedOptions;
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
      console.log(`Creating ${questions.length} bulk questions`);
      console.log('First question sample:', {
        text: questions[0]?.text.substring(0, 30) + '...',
        topicId: questions[0]?.topicId,
        difficulty: questions[0]?.difficulty,
        optionsCount: questions[0]?.options.length
      });
      
      // Process questions in batches to avoid overwhelming the API
      const batchSize = 10;
      const totalQuestions = questions.length;
      
      for (let i = 0; i < totalQuestions; i += batchSize) {
        const batch = questions.slice(i, Math.min(i + batchSize, totalQuestions));
        console.log(`Processing batch ${i/batchSize + 1}, size: ${batch.length}`);
        
        // Create promises for each question in the batch
        const promises = batch.map(q => {
          // Make sure all options have proper IDs (numeric strings, not "option-X")
          const cleanedOptions = q.options.map((opt, index) => ({
            ...opt,
            id: String(index + 1)
          }));
          
          // Log question being created
          console.log(`Creating question: "${q.text.substring(0, 30)}..." with topic: "${q.topicId}"`);
          
          return this.createQuestion({
            text: q.text,
            options: JSON.stringify(cleanedOptions),
            explanation: q.explanation || '',
            topic: q.topicId,
            difficulty: q.difficulty
          });
        });
        
        // Wait for all promises in this batch to resolve
        const results = await Promise.all(promises);
        console.log(`Batch ${i/batchSize + 1} completed, created ${results.filter(Boolean).length} questions`);
      }
      
      console.log(`Bulk question creation completed successfully`);
      return true;
    } catch (error) {
      console.error('Error creating bulk questions:', error);
      throw error; // Re-throw to handle in the calling function
    }
  }
}; 