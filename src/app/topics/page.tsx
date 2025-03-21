'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { topicService } from '@/services/topicService';
import { Topic } from '@/types';

export default function TopicsIndexPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTopics = async () => {
      try {
        setLoading(true);
        const fetchedTopics = await topicService.getTopics();
        setTopics(fetchedTopics);
      } catch (error) {
        console.error('Error loading topics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-12"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="bg-gray-200 dark:bg-gray-700 rounded-lg p-6 h-48"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Topics
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-300 mb-8">
          Select a topic to practice questions
        </p>
        
        {topics.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
              No topics available
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              There are currently no topics available. Please check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic) => (
              <Link 
                key={topic.id} 
                href={`/topics/${topic.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {topic.name}
                    </h2>
                    <span className="bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {topic.questionCount || 0} questions
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {topic.description}
                  </p>
                  <div className="mt-auto text-sky-600 dark:text-sky-400 font-medium text-sm flex items-center">
                    Practice this topic
                    <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 