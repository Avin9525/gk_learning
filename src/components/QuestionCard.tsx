'use client';

import { useState, useEffect } from 'react';
import { Question, Option } from '@/types';
import { progressService } from '@/services/progressService';
import { questionService } from '@/services/questionService';

interface QuestionCardProps {
  question: Question;
  userId: string;
  onComplete?: (correct: boolean) => void;
}

export default function QuestionCard({ question, userId, onComplete }: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrichedOptions, setEnrichedOptions] = useState<Option[]>([]);
  const [originalOptions, setOriginalOptions] = useState<Option[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  
  // Parse options if they're stored as a string
  const options: Option[] = question.parsedOptions || 
    (typeof question.options === 'string' ? JSON.parse(question.options) : []);
  
  // Load additional options if needed
  useEffect(() => {
    // Reset state for new question
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsCorrect(false);
    setIsEnriching(false);
    
    // Save the original options
    setOriginalOptions(options);
    
    // Check if we need to enrich with additional options
    if (options.length === 1 && !isEnriching) {
      setIsEnriching(true);
      enrichOptionsWithAdditionalChoices(options);
    } else {
      setEnrichedOptions(options);
    }
  }, [question.$id, question.options]);

  // Function to enrich options with additional choices from other questions
  const enrichOptionsWithAdditionalChoices = async (currentOptions: Option[]) => {
    try {
      console.log("Enriching options for question:", question.text);
      
      // Get some random questions to borrow options from
      const allQuestions = await questionService.getAllQuestions();
      console.log("Fetched questions for enrichment:", allQuestions.length);
      
      // Filter out the current question and questions with no parsed options
      const otherQuestions = allQuestions.filter(q => 
        q.$id !== question.$id && 
        q.parsedOptions && 
        q.parsedOptions.length > 0
      );
      console.log("Filtered other questions:", otherQuestions.length);
      
      // If no other questions are available, just use the original options
      if (otherQuestions.length === 0) {
        console.log("No other questions available for enrichment");
        setEnrichedOptions(currentOptions);
        setIsEnriching(false);
        return;
      }
      
      // Create a pool of additional options from other questions
      const additionalOptions: Option[] = [];
      
      // Shuffle the questions to get random ones
      const shuffledQuestions = [...otherQuestions].sort(() => Math.random() - 0.5);
      
      // Extract options from other questions
      for (const q of shuffledQuestions) {
        if (q.parsedOptions) {
          // Get incorrect options only
          const incorrectOptions = q.parsedOptions.filter(opt => !opt.isCorrect);
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
      
      console.log("Additional options found:", additionalOptions.length);
      
      // Combine original options with additional ones
      const combinedOptions = [
        ...currentOptions,
        ...additionalOptions.slice(0, 3) // Limit to 3 additional options
      ];
      
      // Shuffle the combined options to randomize order
      const shuffledOptions = [...combinedOptions].sort(() => Math.random() - 0.5);
      
      console.log("Final enriched options:", shuffledOptions.length);
      setEnrichedOptions(shuffledOptions);
    } catch (error) {
      console.error('Error enriching options:', error);
      // Fallback to original options if there's an error
      setEnrichedOptions(currentOptions);
    } finally {
      setIsEnriching(false);
    }
  };
  
  const handleSelectOption = (optionId: string) => {
    if (!isSubmitted) {
      setSelectedOption(optionId);
    }
  };
  
  const handleSubmit = async () => {
    if (!selectedOption || isSubmitted || loading) return;
    
    setLoading(true);
    
    try {
      // First check if it's an original option
      let option = originalOptions.find(opt => opt.id === selectedOption);
      
      // Determine if correct based on whether it's a real option and if it's marked correct
      const correct = option?.isCorrect || false;
      setIsCorrect(correct);
      setIsSubmitted(true);
      
      // Update progress in Appwrite
      if (userId) {
        await progressService.updateUserProgress(
          userId,
          question.$id!,
          correct
        );
      }
      
      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete(correct);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getOptionClassName = (option: Option) => {
    if (!isSubmitted) {
      return selectedOption === option.id
        ? 'bg-indigo-100 border-indigo-500 dark:bg-indigo-900 dark:border-indigo-400'
        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700';
    }
    
    // Check if this is an original or added option
    const isOriginalOption = originalOptions.some(o => o.id === option.id);
    
    if (isOriginalOption && option.isCorrect) {
      return 'bg-green-100 border-green-500 dark:bg-green-900 dark:border-green-400';
    }
    
    if (selectedOption === option.id && (!isOriginalOption || !option.isCorrect)) {
      return 'bg-red-100 border-red-500 dark:bg-red-900 dark:border-red-400';
    }
    
    return 'bg-white dark:bg-gray-800 opacity-70';
  };
  
  const renderFeedback = () => {
    if (!isSubmitted) return null;
    
    return (
      <div className={`mt-4 p-4 rounded-md ${
        isCorrect 
          ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100' 
          : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      }`}>
        <h3 className="font-medium mb-2">
          {isCorrect ? 'Correct!' : 'Incorrect!'}
        </h3>
        {question.explanation && (
          <p>{question.explanation}</p>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
          {question.topic}
        </span>
        <span className="text-sm font-medium px-2.5 py-0.5 rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
          {question.difficulty}
        </span>
      </div>
      
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
        {question.text}
      </h2>
      
      <div className="space-y-3 mb-6">
        {enrichedOptions.length > 0 ? (
          enrichedOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelectOption(option.id)}
              disabled={isSubmitted}
              className={`w-full text-left p-4 border rounded-md transition-colors ${getOptionClassName(option)}`}
            >
              {option.text}
            </button>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">Loading options...</p>
          </div>
        )}
      </div>
      
      {renderFeedback()}
      
      <div className="mt-6 flex justify-end">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedOption || loading || enrichedOptions.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Answer'}
          </button>
        ) : (
          <button
            onClick={() => onComplete?.(isCorrect)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
} 