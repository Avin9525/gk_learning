import { Account, Client, Databases, ID, Query } from 'appwrite';

// Initialize the Appwrite client
const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

// Export initialized services
export const account = new Account(client);
export const databases = new Databases(client);
export const appwriteConfig = {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '',
  questionCollectionId: process.env.NEXT_PUBLIC_APPWRITE_QUESTION_COLLECTION_ID || '',
  userProgressCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USER_PROGRESS_COLLECTION_ID || '',
};

// Export utility for generating unique IDs
export { ID, Query }; 