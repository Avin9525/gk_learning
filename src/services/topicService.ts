import { databases, appwriteConfig, Query } from '@/lib/appwrite';
import { Topic } from '@/types';

export const topicService = {
  // Get all available topics
  async getTopics(): Promise<Topic[]> {
    try {
      // For this example, we'll use predefined topics, but in a real app
      // this would come from a topics collection in Appwrite
      const topics: Topic[] = [
        {
          id: 'history',
          name: 'History',
          description: 'Test your knowledge of historical events and figures'
        },
        {
          id: 'science',
          name: 'Science',
          description: 'Questions about physics, chemistry, biology, and more'
        },
        {
          id: 'geography',
          name: 'Geography',
          description: 'Test your knowledge of countries, capitals, and landmarks'
        },
        {
          id: 'literature',
          name: 'Literature',
          description: 'Questions about books, authors, and literary movements'
        },
        {
          id: 'sports',
          name: 'Sports',
          description: 'Test your knowledge of sports, athletes, and competitions'
        }
      ];
      
      // Get the question count for each topic
      const enrichedTopics = await Promise.all(
        topics.map(async (topic) => {
          // Count questions for this topic with pagination support
          let totalCount = 0;
          let offset = 0;
          const limit = 100; // Maximum limit per page in Appwrite
          let hasMore = true;
          
          while (hasMore) {
            const response = await databases.listDocuments(
              appwriteConfig.databaseId,
              appwriteConfig.questionCollectionId,
              [Query.equal('topic', topic.id), Query.limit(limit), Query.offset(offset)]
            );
            
            totalCount += response.documents.length;
            
            // Check if there are more documents to fetch
            if (response.documents.length < limit) {
              hasMore = false;
            } else {
              offset += limit;
            }
          }
          
          return {
            ...topic,
            questionCount: totalCount
          };
        })
      );
      
      return enrichedTopics;
    } catch (error) {
      console.error('Error fetching topics:', error);
      return [];
    }
  },

  // Get a single topic by ID
  async getTopicById(id: string): Promise<Topic | null> {
    try {
      const topics = await this.getTopics();
      return topics.find(topic => topic.id === id) || null;
    } catch (error) {
      console.error(`Error fetching topic with ID ${id}:`, error);
      return null;
    }
  }
}; 