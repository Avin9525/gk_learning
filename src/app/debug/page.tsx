'use client';

import { useState, useEffect } from 'react';
import { databases, account } from '@/lib/appwrite';
import { appwriteConfig, Query } from '@/lib/appwrite';
import { topicService } from '@/services/topicService';

export default function DebugPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking...');
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [databaseStatus, setDatabaseStatus] = useState<string>('Checking...');
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [fetchingTopicQuestions, setFetchingTopicQuestions] = useState(false);
  const [topicQuestions, setTopicQuestions] = useState<any[]>([]);

  useEffect(() => {
    // Check basic connection
    checkConnection();
    // Check auth
    checkAuth();
    // Check database
    checkDatabase();
    // Show config values (without sensitive data)
    showConfig();
    // Load topics
    loadTopics();
  }, []);

  async function loadTopics() {
    try {
      const availableTopics = await topicService.getTopics();
      setTopics(availableTopics);
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  }

  async function checkConnection() {
    try {
      // Check if we can access health endpoint
      // Since direct health check isn't available in the SDK, we'll check
      // if the project ID is properly set
      if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
        throw new Error('Project ID is not set');
      }
      setConnectionStatus('Connected to Appwrite endpoint');
    } catch (error: any) {
      setConnectionStatus(`Failed: ${error.message}`);
      setError(`Connection error: ${error.message}`);
    }
  }

  async function checkAuth() {
    try {
      // Try to check if account service is working
      // This just checks if the service is accessible, not if user is logged in
      await account.get().catch(() => {
        // It's expected to fail if not logged in, but service is working
        setAuthStatus('Auth service is accessible (not logged in)');
      });
    } catch (error: any) {
      setAuthStatus(`Failed: ${error.message}`);
      setError(`Auth error: ${error.message}`);
    }
  }

  async function checkDatabase() {
    try {
      // Check if database exists
      if (!appwriteConfig.databaseId) {
        throw new Error('Database ID not configured');
      }
      
      try {
        // Try to list documents from questions collection
        // This may fail due to permissions, but we're checking if the service responds
        await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.questionCollectionId
        );
        setDatabaseStatus('Database connection successful');
      } catch (dbError: any) {
        if (dbError.code === 401) {
          // Permission error - service is working but needs authentication
          setDatabaseStatus('Database service accessible (needs authentication)');
        } else if (dbError.code === 404) {
          // Collection not found
          setDatabaseStatus('Database accessible but collection not found');
        } else {
          throw dbError;
        }
      }
    } catch (error: any) {
      setDatabaseStatus(`Failed: ${error.message}`);
      setError(`Database error: ${error.message}`);
    }
  }

  function showConfig() {
    setConfigValues({
      endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'Not set',
      projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ? '✓ Set' : '✗ Not set',
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'Not set',
      questionCollection: process.env.NEXT_PUBLIC_APPWRITE_QUESTION_COLLECTION_ID || 'Not set',
      userProgressCollection: process.env.NEXT_PUBLIC_APPWRITE_USER_PROGRESS_COLLECTION_ID || 'Not set',
    });
  }

  async function fetchQuestions() {
    setLoadingQuestions(true);
    try {
      // Fetch questions with pagination to get all questions
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
      
      console.log(`Total questions fetched: ${allDocuments.length}`);
      setQuestions(allDocuments);
      setLoadingQuestions(false);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      setError(`Failed to fetch questions: ${error.message}`);
      setLoadingQuestions(false);
    }
  }

  async function fetchTopicQuestions(topicId: string) {
    if (!topicId) return;
    
    setFetchingTopicQuestions(true);
    try {
      // Fetch topic questions with pagination
      let allDocuments: any[] = [];
      let offset = 0;
      const limit = 100; // Maximum limit per page in Appwrite
      let hasMore = true;
      
      while (hasMore) {
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.questionCollectionId,
          [Query.equal('topic', topicId), Query.limit(limit), Query.offset(offset)]
        );
        
        allDocuments = [...allDocuments, ...response.documents];
        
        // Check if there are more documents to fetch
        if (response.documents.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
      
      console.log(`Total questions for topic ${topicId}: ${allDocuments.length}`);
      setTopicQuestions(allDocuments);
      setFetchingTopicQuestions(false);
    } catch (error: any) {
      console.error(`Error fetching questions for topic ${topicId}:`, error);
      setError(`Failed to fetch topic questions: ${error.message}`);
      setFetchingTopicQuestions(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Appwrite Connection Debug</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p className="font-bold">Error Detected</p>
          <p>{error}</p>
          <div className="mt-2">
            <p className="font-semibold">Common Solutions:</p>
            <ul className="list-disc ml-5">
              <li>Check if your .env file has the correct Appwrite credentials</li>
              <li>Make sure your Appwrite project exists and is accessible</li>
              <li>Check if your database and collections are created</li>
              <li>Verify the permissions settings in your Appwrite collections</li>
              <li>Check for CORS issues (for browser requests)</li>
            </ul>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Connection Status
          </h3>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          <dl>
            <div className="bg-gray-50 dark:bg-gray-900 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Appwrite Connection
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {connectionStatus}
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Authentication Service
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {authStatus}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Database Connection
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {databaseStatus}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Questions Overview
          </h3>
          <button
            onClick={fetchQuestions}
            disabled={loadingQuestions}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loadingQuestions ? 'Loading...' : 'Fetch All Questions'}
          </button>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {questions.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Found {questions.length} questions total:</p>
              <ul className="space-y-4">
                {questions.map((q, index) => (
                  <li key={q.$id} className="p-3 bg-gray-50 rounded">
                    <p className="font-medium">{index + 1}. {q.text}</p>
                    <p className="text-sm text-gray-500">ID: {q.$id} | Topic: {q.topic} | Difficulty: {q.difficulty}</p>
                    <p className="text-xs text-gray-400 mt-1">Options: {q.options}</p>
                  </li>
                )).slice(0, 5)}
                {questions.length > 5 && (
                  <p className="text-sm text-gray-500">...and {questions.length - 5} more</p>
                )}
              </ul>
            </div>
          ) : loadingQuestions ? (
            <p>Loading questions...</p>
          ) : (
            <p>No questions fetched yet. Click the button to fetch all questions.</p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Topics
          </h3>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {topics.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Available Topics:</p>
              <ul className="space-y-2">
                {topics.map(topic => (
                  <li key={topic.id} className="p-2 bg-gray-50 rounded flex justify-between items-center">
                    <div>
                      <p className="font-medium">{topic.name}</p>
                      <p className="text-sm text-gray-500">ID: {topic.id} | Questions: {topic.questionCount || 0}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTopic(topic.id);
                        fetchTopicQuestions(topic.id);
                      }}
                      className="px-3 py-1 bg-blue-500 text-sm text-white rounded hover:bg-blue-600"
                    >
                      View Questions
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No topics found</p>
          )}
        </div>
      </div>

      {selectedTopic && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Questions for Topic: {topics.find(t => t.id === selectedTopic)?.name}
            </h3>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {fetchingTopicQuestions ? (
              <p>Loading questions...</p>
            ) : topicQuestions.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium">Found {topicQuestions.length} questions:</p>
                <ul className="space-y-4">
                  {topicQuestions.map((q, index) => (
                    <li key={q.$id} className="p-3 bg-gray-50 rounded">
                      <p className="font-medium">{index + 1}. {q.text}</p>
                      <p className="text-sm text-gray-500">ID: {q.$id} | Topic: {q.topic} | Difficulty: {q.difficulty}</p>
                      <p className="text-xs text-gray-400 mt-1">Options: {q.options}</p>
                    </li>
                  )).slice(0, 5)}
                  {topicQuestions.length > 5 && (
                    <p className="text-sm text-gray-500">...and {topicQuestions.length - 5} more</p>
                  )}
                </ul>
              </div>
            ) : (
              <p>No questions found for this topic</p>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Configuration
          </h3>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          <dl>
            {Object.entries(configValues).map(([key, value], index) => (
              <div key={key} className={`${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {key}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
} 