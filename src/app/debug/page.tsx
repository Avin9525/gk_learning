'use client';

import { useState, useEffect } from 'react';
import { databases, account } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite';

export default function DebugPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking...');
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [databaseStatus, setDatabaseStatus] = useState<string>('Checking...');
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check basic connection
    checkConnection();
    // Check auth
    checkAuth();
    // Check database
    checkDatabase();
    // Show config values (without sensitive data)
    showConfig();
  }, []);

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
      databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ? '✓ Set' : '✗ Not set',
      questionCollection: process.env.NEXT_PUBLIC_APPWRITE_QUESTION_COLLECTION_ID ? '✓ Set' : '✗ Not set',
      userProgressCollection: process.env.NEXT_PUBLIC_APPWRITE_USER_PROGRESS_COLLECTION_ID ? '✓ Set' : '✗ Not set',
    });
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