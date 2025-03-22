'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { questionService } from '@/services/questionService';
import { topicService } from '@/services/topicService';
import { authService } from '@/services/authService';
import { Topic, Option } from '@/types';
import Link from 'next/link';

export default function EditQuestionPage() {
  const params = useParams();
  const questionId = params.id as string;
  const router = useRouter();
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Form state
  const [questionText, setQuestionText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const auth = await authService.isAuthenticated();
      setIsAuthenticated(auth);
      if (!auth) {
        router.push('/auth/login');
      }
    };

    const loadData = async () => {
      setLoading(true);
      try {
        // Get topics
        const fetchedTopics = await topicService.getTopics();
        setTopics(fetchedTopics);
        
        // Get question details
        const question = await questionService.getQuestionById(questionId);
        if (!question) {
          setError('Question not found');
          return;
        }
        
        // Populate form with question data
        setQuestionText(question.text);
        setSelectedTopic(question.topic);
        setDifficulty(question.difficulty);
        setExplanation(question.explanation || '');
        
        // Handle options
        if (question.parsedOptions && question.parsedOptions.length > 0) {
          setOptions(question.parsedOptions);
        } else if (typeof question.options === 'string') {
          try {
            const parsedOptions = JSON.parse(question.options);
            setOptions(parsedOptions);
          } catch (e) {
            console.error('Error parsing options:', e);
            setOptions([{ id: '1', text: '', isCorrect: true }]);
          }
        } else {
          setOptions([{ id: '1', text: '', isCorrect: true }]);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load question. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    loadData();
  }, [questionId, router]);

  const handleOptionTextChange = (index: number, value: string) => {
    const updatedOptions = [...options];
    updatedOptions[index].text = value;
    setOptions(updatedOptions);
  };

  const handleOptionCorrectChange = (index: number) => {
    const updatedOptions = [...options];
    // Set all options to false first
    updatedOptions.forEach(option => {
      option.isCorrect = false;
    });
    // Set the selected option to true
    updatedOptions[index].isCorrect = true;
    setOptions(updatedOptions);
  };

  const addOption = () => {
    setOptions([
      ...options,
      { id: `${options.length + 1}`, text: '', isCorrect: false }
    ]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 1) {
      setError('Question must have at least one option');
      return;
    }
    
    const updatedOptions = [...options];
    updatedOptions.splice(index, 1);
    
    // If we removed the correct option, set the first option as correct
    if (options[index].isCorrect && updatedOptions.length > 0) {
      updatedOptions[0].isCorrect = true;
    }
    
    setOptions(updatedOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      // Basic validation
      if (!selectedTopic) {
        setError('Please select a topic');
        setSaving(false);
        return;
      }
      
      if (!questionText.trim()) {
        setError('Please enter a question text');
        setSaving(false);
        return;
      }
      
      // Ensure at least one option exists and has text
      if (options.length < 1 || !options[0].text.trim()) {
        setError('Please add at least one option with text');
        setSaving(false);
        return;
      }
      
      // Validate that only one option is marked as correct
      const correctOptions = options.filter(option => option.isCorrect);
      if (correctOptions.length !== 1) {
        setError('Please mark exactly one option as correct');
        setSaving(false);
        return;
      }
      
      // Clean up options data - remove any empty options
      const cleanedOptions = options.filter(option => option.text.trim() !== '');
      
      // Update the question
      await questionService.updateQuestion(questionId, {
        topic: selectedTopic,
        text: questionText,
        options: JSON.stringify(cleanedOptions),
        difficulty,
        explanation: explanation || ''
      });
      
      setSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update question');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900">Please login to edit questions</h2>
          <p className="mt-2 text-gray-600">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-sky-500 px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Edit Question</h1>
          <Link
            href="/admin/questions/manage"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-sky-700 hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            Back to Questions
          </Link>
        </div>
        
        {loading ? (
          <div className="p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading question...</p>
          </div>
        ) : (
          <>
            {success && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 m-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      Question updated successfully!
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Topic Selection */}
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-900">
                  Topic <span className="text-red-500">*</span>
                </label>
                <select
                  id="topic"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md text-gray-900"
                >
                  <option value="" className="text-gray-900">Select a topic</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id} className="text-gray-900">
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Question Text */}
              <div>
                <label htmlFor="text" className="block text-sm font-medium text-gray-900">
                  Question Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="text"
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-gray-900"
                  placeholder="Enter your question here"
                />
              </div>
              
              {/* Options */}
              <div>
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-900">
                    Options <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addOption}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                  >
                    <svg className="-ml-0.5 mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Option
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1 mb-2">
                  At least 1 option is required. Mark one option as correct.
                </p>
                
                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`correct-${index}`}
                        name="correctOption"
                        checked={option.isCorrect}
                        onChange={() => handleOptionCorrectChange(index)}
                        className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-gray-300"
                      />
                      <input
                        type="text"
                        className="flex-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-gray-900"
                        placeholder={`Option ${index + 1}`}
                        value={option.text}
                        onChange={(e) => handleOptionTextChange(index, e.target.value)}
                      />
                      {options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="inline-flex items-center p-1 border border-transparent rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Difficulty */}
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-900">
                  Difficulty Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md text-gray-900"
                >
                  <option value="easy" className="text-gray-900">Easy</option>
                  <option value="medium" className="text-gray-900">Medium</option>
                  <option value="hard" className="text-gray-900">Hard</option>
                </select>
              </div>
              
              {/* Explanation */}
              <div>
                <label htmlFor="explanation" className="block text-sm font-medium text-gray-900">
                  Explanation (Optional)
                </label>
                <textarea
                  id="explanation"
                  rows={3}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                  placeholder="Explain why the correct answer is right (optional)"
                />
              </div>
              
              {/* Submit Button */}
              <div className="pt-4 flex space-x-3">
                <Link 
                  href="/admin/questions/manage"
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
} 