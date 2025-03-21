import { databases, appwriteConfig, ID, Query } from '@/lib/appwrite';
import { UserProgress } from '@/types';

export const progressService = {
  // Get user progress for a specific question
  async getUserQuestionProgress(userId: string, questionId: string): Promise<UserProgress | null> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userProgressCollectionId,
        [
          Query.equal('userId', userId),
          Query.equal('questionId', questionId)
        ]
      );
      
      if (response.documents.length > 0) {
        return response.documents[0] as unknown as UserProgress;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching user progress for question ${questionId}:`, error);
      return null;
    }
  },

  // Get all progress for a user
  async getAllUserProgress(userId: string): Promise<UserProgress[]> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userProgressCollectionId,
        [Query.equal('userId', userId)]
      );
      return response.documents as unknown as UserProgress[];
    } catch (error) {
      console.error(`Error fetching user progress for user ${userId}:`, error);
      return [];
    }
  },

  // Update or create user progress for a question
  async updateUserProgress(
    userId: string, 
    questionId: string, 
    correct: boolean
  ): Promise<UserProgress | null> {
    try {
      // First, check if progress exists
      const existingProgress = await this.getUserQuestionProgress(userId, questionId);
      
      const now = new Date().toISOString();
      
      if (existingProgress) {
        // Update the existing progress
        const newConsecutiveCorrect = correct 
          ? (existingProgress.consecutiveCorrect || 0) + 1 
          : 0;
          
        const updatedProgress: Partial<UserProgress> = {
          correct,
          lastAttempted: now,
          attemptsCount: existingProgress.attemptsCount + 1,
          consecutiveCorrect: newConsecutiveCorrect,
        };
        
        // Update mastery level based on consecutive correct answers
        if (correct) {
          if (newConsecutiveCorrect >= 5) {
            updatedProgress.masteryLevel = 'mastered';
          } else if (newConsecutiveCorrect >= 3) {
            updatedProgress.masteryLevel = 'review';
          } else if (newConsecutiveCorrect >= 1) {
            updatedProgress.masteryLevel = 'learning';
          }
        } else {
          updatedProgress.masteryLevel = 'learning';
        }
        
        const response = await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userProgressCollectionId,
          existingProgress.$id!,
          updatedProgress
        );
        
        return response as unknown as UserProgress;
      } else {
        // Create new progress record
        const newProgress: Omit<UserProgress, '$id'> = {
          userId,
          questionId,
          correct,
          lastAttempted: now,
          attemptsCount: 1,
          consecutiveCorrect: correct ? 1 : 0,
          masteryLevel: correct ? 'learning' : 'new'
        };
        
        const response = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userProgressCollectionId,
          ID.unique(),
          newProgress
        );
        
        return response as unknown as UserProgress;
      }
    } catch (error) {
      console.error(`Error updating progress for question ${questionId}:`, error);
      return null;
    }
  },

  // Get questions due for review based on mastery level
  async getQuestionsForReview(userId: string): Promise<string[]> {
    try {
      // Get questions that are in 'learning' or 'review' state
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userProgressCollectionId,
        [
          Query.equal('userId', userId),
          Query.notEqual('masteryLevel', 'mastered'),
          Query.notEqual('masteryLevel', 'new')
        ]
      );
      
      // Return the questionIds
      return (response.documents as unknown as UserProgress[]).map(progress => progress.questionId);
    } catch (error) {
      console.error(`Error fetching review questions for user ${userId}:`, error);
      return [];
    }
  }
}; 