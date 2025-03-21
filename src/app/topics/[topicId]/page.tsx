'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Question } from '@/types';
import { questionService } from '@/services/questionService';
import { authService } from '@/services/authService';
import { topicService } from '@/services/topicService';
import QuestionCard from '@/components/QuestionCard';

export default function TopicPracticePage() {
  const params = useParams();
  const topicId = params.topicId as string;
  
  const [topic, setTopic] = useState<{ id: string; name: string; description: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  
  useEffect(() => {
    // Load topic and questions
    const loadData = async () => {
      setLoading(true);
      try {
        // Get current user
        const user = await authService.getCurrentUser();
        if (user && user.$id) {
          setUserId(user.$id);
        }
        
        // Get topic details
        const topicDetails = await topicService.getTopicById(topicId);
        if (topicDetails) {
          setTopic(topicDetails);
        }
        
        // Get questions for this topic
        const topicQuestions = await questionService.getQuestionsByTopic(topicId);
        
        // Get all questions for enrichment if needed
        const allQuestions = await questionService.getAllQuestions();
        
        // Randomize the order of questions
        const shuffledQuestions = [...topicQuestions].sort(() => Math.random() - 0.5);
        
        // Process each question to randomize options
        const processedQuestions = shuffledQuestions.map(question => {
          let parsedOptions = typeof question.options === 'string' 
            ? JSON.parse(question.options) 
            : question.options;
            
          // Enrich questions with only one option
          if (parsedOptions.length === 1) {
            parsedOptions = enrichOptionsWithAdditionalChoices(
              parsedOptions,
              question.$id || '',
              allQuestions
            );
          } 
          // Randomize order of options for all questions
          else {
            parsedOptions = [...parsedOptions].sort(() => Math.random() - 0.5);
          }
          
          // Store the processed options in the question
          question.parsedOptions = parsedOptions;
          
          return question;
        });
        
        setQuestions(processedQuestions);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [topicId]);
  
  // Function to enrich options with additional choices from other questions
  const enrichOptionsWithAdditionalChoices = (
    currentOptions: any[], 
    currentQuestionId: string, 
    allQuestions: Question[]
  ) => {
    try {
      // Filter out the current question and questions with no parsed options
      const otherQuestions = allQuestions.filter(q => 
        q.$id !== currentQuestionId && 
        ((q.parsedOptions && q.parsedOptions.length > 0) || 
        (typeof q.options === 'string' && q.options !== '[]'))
      );
      
      // If no other questions are available, just use the original options
      if (otherQuestions.length === 0) {
        return currentOptions;
      }
      
      // Create a pool of additional options from other questions
      const additionalOptions: any[] = [];
      
      // Shuffle the questions to get random ones
      const shuffledQuestions = [...otherQuestions].sort(() => Math.random() - 0.5);
      
      // Extract options from other questions
      for (const q of shuffledQuestions) {
        const qOptions = q.parsedOptions || 
          (typeof q.options === 'string' ? JSON.parse(q.options) : []);
          
        if (qOptions && qOptions.length > 0) {
          // Get incorrect options only
          const incorrectOptions = qOptions.filter((opt: any) => !opt.isCorrect);
          for (const opt of incorrectOptions) {
            // Create a new option with a unique ID to avoid conflicts
            additionalOptions.push({
              id: `additional-${additionalOptions.length + 1}`,
              text: opt.text,
              isCorrect: false
            });
            
            // Stop when we have enough additional options
            if (additionalOptions.length >= 3) {
              break;
            }
          }
        }
        
        // Stop when we have enough additional options
        if (additionalOptions.length >= 3) {
          break;
        }
      }
      
      // Combine original options with additional ones
      const combinedOptions = [
        ...currentOptions,
        ...additionalOptions.slice(0, 3) // Limit to 3 additional options
      ];
      
      // Shuffle the combined options to randomize order
      return [...combinedOptions].sort(() => Math.random() - 0.5);
    } catch (error) {
      console.error('Error enriching options:', error);
      // Fallback to original options if there's an error
      return currentOptions;
    }
  };
  
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
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-60 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-72 mb-12"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-3xl"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show message if no questions are available
  if (questions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {topic?.name || 'Topic Practice'}
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-300 mb-8">
            {topic?.description}
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
              No questions available
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              There are currently no questions available for this topic. Please check back later or try another topic.
            </p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {topic?.name || 'Topic Practice'} - Completed!
          </h1>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
              Great job!
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
                onClick={() => {
                  // Reload the page to get new randomized questions
                  window.location.reload();
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Practice Again
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
          {topic?.name || 'Topic Practice'}
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-300 mb-8 text-center">
          {topic?.description}
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