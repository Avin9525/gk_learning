'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Question } from '@/types';
import { questionService } from '@/services/questionService';
import { progressService } from '@/services/progressService';
import { authService } from '@/services/authService';
import QuestionCard from '@/components/QuestionCard';

export default function ReviewPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Check authentication and load review questions
    const loadData = async () => {
      setLoading(true);
      try {
        // Check if user is authenticated
        const authenticated = await authService.isAuthenticated();
        setIsAuthenticated(authenticated);
        
        if (!authenticated) {
          return; // Don't proceed if not authenticated
        }
        
        // Get current user
        const user = await authService.getCurrentUser();
        if (user && user.$id) {
          setUserId(user.$id);
          
          // Get questions due for review
          const questionIds = await progressService.getQuestionsForReview(user.$id);
          
          if (questionIds.length > 0) {
            // Fetch the actual questions from their IDs
            const reviewQuestions: Question[] = [];
            
            for (const id of questionIds) {
              const question = await questionService.getQuestionById(id);
              if (question) {
                reviewQuestions.push(question);
              }
            }
            
            setQuestions(reviewQuestions);
          }
        }
      } catch (error) {
        console.error('Error loading review data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  const handleQuestionComplete = (correct: boolean) => {
    setCompletedCount(prev => prev + 1);
    if (correct) {
      setCorrectCount(prev => prev + 1);
    }
    
    // Move to the next question if available
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Daily Review
          </h1>
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-3xl"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Daily Review
          </h1>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
              Login Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You need to be logged in to access your personalized review session.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push('/auth/login')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Log In
              </button>
              <button
                onClick={() => router.push('/auth/register')}
                className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show message if no questions need review
  if (questions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Daily Review
          </h1>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
              No questions to review
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Great job! You don't have any questions due for review right now. Come back later or practice more topics.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show completed message if all questions are answered
  if (completedCount === questions.length) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Daily Review - Completed!
          </h1>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
              Review complete!
            </h2>
            <div className="mb-6 text-center">
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                {correctCount} / {questions.length}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                You answered {correctCount} out of {questions.length} questions correctly.
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show the current question
  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Daily Review
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-300 mb-8 text-center">
          Review questions based on your learning progress
        </p>
        
        <div className="mb-6 text-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full" 
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <QuestionCard
          question={currentQuestion}
          userId={userId || ''}
          onComplete={handleQuestionComplete}
        />
      </div>
    </div>
  );
} 