'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { questionService } from '@/services/questionService';
import { topicService } from '@/services/topicService';
import { authService } from '@/services/authService';
import { progressService } from '@/services/progressService';
import { Topic, Question } from '@/types';
import Link from 'next/link';

export default function TestPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<{[key: number]: string}>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startingTest, setStartingTest] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const user = await authService.getCurrentUser();
        if (user && user.$id) {
          setUserId(user.$id);
        }
        
        const fetchedTopics = await topicService.getTopics();
        setTopics(fetchedTopics);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const startTest = async () => {
    if (!selectedTopic) {
      setError('Please select a topic');
      return;
    }

    setStartingTest(true);
    try {
      // Fetch questions for the selected topic (will handle pagination internally)
      const allQuestions = await questionService.getQuestionsByTopic(selectedTopic);
      
      // Also fetch all questions to use for option enrichment (will handle pagination internally)
      const allAvailableQuestions = await questionService.getAllQuestions();
      
      // Randomly select the requested number of questions
      let shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
      let selected = shuffled.slice(0, Math.min(numQuestions, shuffled.length));
      
      if (selected.length === 0) {
        setError('No questions available for the selected topic');
        setStartingTest(false);
        return;
      }

      // Enrich questions with only one option and randomize all options
      const enrichedQuestions = selected.map(question => {
        let parsedOptions = parseOptions(question.options);
        
        // Enrich questions with only one option
        if (parsedOptions.length === 1) {
          parsedOptions = enrichOptionsWithAdditionalChoices(
            parsedOptions, 
            question.$id || '', 
            allAvailableQuestions
          );
        } 
        // Randomize order of options for all questions (including already shuffled enriched ones)
        else {
          parsedOptions = [...parsedOptions].sort(() => Math.random() - 0.5);
        }
        
        question.parsedOptions = parsedOptions;
        return question;
      });

      setTestQuestions(enrichedQuestions);
      setCurrentQuestionIndex(0);
      setSelectedOptions({});
      setShowResults(false);
      setScore(0);
      setStartingTest(false);
      setError('');
    } catch (err) {
      console.error('Error starting test:', err);
      setError('Failed to start test. Please try again.');
      setStartingTest(false);
    }
  };

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
        const qOptions = q.parsedOptions || parseOptions(q.options);
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

  const handleOptionSelect = (questionIndex: number, optionId: string) => {
    setSelectedOptions({
      ...selectedOptions,
      [questionIndex]: optionId
    });
  };

  const calculateScore = () => {
    let correctCount = 0;
    testQuestions.forEach((question, index) => {
      const selectedOptionId = selectedOptions[index];
      if (selectedOptionId) {
        // Use parsedOptions if available, otherwise parse the options string
        const options = question.parsedOptions || 
          (typeof question.options === 'string' ? JSON.parse(question.options) : question.options);
          
        const selectedOption = options.find((opt: any) => opt.id === selectedOptionId);
        
        // For enriched questions, we need to check if the selected option is from the original set
        // If the ID starts with 'additional-', it's an added option and is always incorrect
        if (selectedOption && selectedOption.isCorrect && !selectedOptionId.startsWith('additional-')) {
          correctCount++;
        }
      }
    });
    return correctCount;
  };

  const handleSubmitTest = async () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setShowResults(true);

    // Update user progress for each question
    if (userId) {
      for (let i = 0; i < testQuestions.length; i++) {
        const question = testQuestions[i];
        const selectedOptionId = selectedOptions[i];
        
        if (selectedOptionId && question.$id) {
          // Use parsedOptions if available
          const options = question.parsedOptions || 
            (typeof question.options === 'string' ? JSON.parse(question.options) : question.options);
            
          const selectedOption = options.find((opt: any) => opt.id === selectedOptionId);
          
          // For enriched questions, we need to check if the selected option is from the original set
          const isCorrect = selectedOption && selectedOption.isCorrect && !selectedOptionId.startsWith('additional-');
          
          try {
            await progressService.updateUserProgress(
              userId,
              question.$id,
              isCorrect || false
            );
          } catch (error) {
            console.error('Error updating progress:', error);
          }
        }
      }
    }
  };

  const handleRestartTest = () => {
    setTestQuestions([]);
    setSelectedOptions({});
    setShowResults(false);
    setCurrentQuestionIndex(0);
  };

  // Parse options safely and normalize IDs
  const parseOptions = (options: any) => {
    try {
      let parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
      
      // Normalize option IDs to ensure they're in the correct format (numeric strings)
      if (Array.isArray(parsedOptions)) {
        parsedOptions = parsedOptions.map((opt, index) => {
          // If the ID is in the format "option-X", convert it to a numeric ID
          if (opt.id && typeof opt.id === 'string' && opt.id.startsWith('option-')) {
            return {
              ...opt,
              id: String(index + 1)
            };
          }
          return opt;
        });
      }
      
      return parsedOptions;
    } catch (e) {
      console.error('Error parsing options:', e);
      return [];
    }
  };

  // Function to render the current question
  const renderCurrentQuestion = () => {
    const question = testQuestions[currentQuestionIndex];
    if (!question) return null;

    // Use parsedOptions if available (for enriched questions), otherwise parse the options string
    const options = question.parsedOptions || parseOptions(question.options);
    
    return (
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-sky-500 px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            Question {currentQuestionIndex + 1} of {testQuestions.length}
          </h2>
        </div>
        
        <div className="p-6">
          <p className="text-lg font-medium text-gray-900 mb-4">{question.text}</p>
          
          <div className="space-y-3">
            {options.map((option: any) => (
              <label
                key={option.id}
                className={`flex items-center p-3 rounded-lg border ${
                  selectedOptions[currentQuestionIndex] === option.id
                    ? 'bg-sky-50 border-sky-500'
                    : 'border-gray-300 hover:bg-gray-50'
                } cursor-pointer transition-colors`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestionIndex}`}
                  value={option.id}
                  checked={selectedOptions[currentQuestionIndex] === option.id}
                  onChange={() => handleOptionSelect(currentQuestionIndex, option.id)}
                  className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-gray-300"
                />
                <span className="ml-3 text-gray-900">{option.text}</span>
              </label>
            ))}
          </div>
          
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
            >
              Previous
            </button>
            
            {currentQuestionIndex < testQuestions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitTest}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render results screen
  const renderResults = () => {
    return (
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-sky-500 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Test Results</h2>
        </div>
        
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-gray-900">
              Your Score: {score} / {testQuestions.length}
            </p>
            <p className="text-lg text-gray-600 mt-2">
              {Math.round((score / testQuestions.length) * 100)}% Correct
            </p>
          </div>
          
          <div className="space-y-6 mt-8">
            {testQuestions.map((question, index) => {
              // Use parsed options from enriched questions if available
              const options = question.parsedOptions || parseOptions(question.options);
              const selectedOptionId = selectedOptions[index];
              const selectedOption = options.find((opt: any) => opt.id === selectedOptionId);
              const correctOption = options.find((opt: any) => opt.isCorrect);
              
              // Check if the selected option is one of the original (non-additional) options and is correct
              const isCorrect = selectedOption && selectedOption.isCorrect && !selectedOptionId.startsWith('additional-');
              
              return (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <div className={`px-4 py-2 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center">
                      {isCorrect ? (
                        <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <p className="font-medium">Question {index + 1}</p>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <p className="text-gray-900 mb-4">{question.text}</p>
                    
                    <div className="space-y-2">
                      {options.map((option: any) => (
                        <div 
                          key={option.id} 
                          className={`p-2 rounded ${
                            option.isCorrect 
                              ? 'bg-green-50 border-green-200 border' 
                              : selectedOptionId === option.id 
                                ? 'bg-red-50 border-red-200 border' 
                                : ''
                          }`}
                        >
                          <p className={`${
                            option.isCorrect 
                              ? 'text-green-800' 
                              : selectedOptionId === option.id 
                                ? 'text-red-800' 
                                : 'text-gray-700'
                          }`}>
                            {option.text} 
                            {option.isCorrect && ' ✓'}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {question.explanation && (
                      <div className="mt-4 bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">Explanation:</span> {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 flex space-x-4">
            <button
              type="button"
              onClick={handleRestartTest}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              Take Another Test
            </button>
            <Link 
              href="/"
              className="flex-1 flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  };

  // Render test setup
  const renderTestSetup = () => {
    return (
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-sky-500 px-6 py-4">
          <h1 className="text-xl font-bold text-white">Take a Test</h1>
        </div>
        
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-900">
              Select Topic
            </label>
            <select
              id="topic"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md text-gray-900"
            >
              <option value="">Select a topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id} className="text-gray-900">
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-900">
              Number of Questions
            </label>
            <select
              id="numQuestions"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md text-gray-900"
            >
              <option value="5">5 Questions</option>
              <option value="10">10 Questions</option>
              <option value="15">15 Questions</option>
              <option value="20">20 Questions</option>
              <option value="25">25 Questions</option>
            </select>
          </div>
          
          <div className="pt-4">
            <button
              type="button"
              onClick={startTest}
              disabled={startingTest || !selectedTopic}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
            >
              {startingTest ? 'Loading...' : 'Start Test'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="rounded-full bg-sky-100 h-12 w-12 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="h-4 bg-sky-100 rounded w-24 mb-2.5"></div>
            <div className="h-2 bg-sky-100 rounded w-12"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {testQuestions.length === 0 ? (
        renderTestSetup()
      ) : showResults ? (
        renderResults()
      ) : (
        renderCurrentQuestion()
      )}
    </div>
  );
} 