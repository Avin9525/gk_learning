'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { questionService } from '@/services/questionService';
import { topicService } from '@/services/topicService';
import { authService } from '@/services/authService';
import { Topic } from '@/types';

type FormData = {
  topic: string;
  text: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
};

export default function AddQuestionPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      topic: '',
      text: '',
      options: [
        { id: '1', text: '', isCorrect: true },
      ],
      difficulty: 'medium',
      explanation: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options'
  });

  useEffect(() => {
    const checkAuth = async () => {
      const auth = await authService.isAuthenticated();
      setIsAuthenticated(auth);
      if (!auth) {
        router.push('/auth/login');
      }
    };

    const loadTopics = async () => {
      const fetchedTopics = await topicService.getTopics();
      setTopics(fetchedTopics);
    };

    checkAuth();
    loadTopics();
  }, [router]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      // Basic validation
      if (!data.topic) {
        setError('Please select a topic');
        setLoading(false);
        return;
      }
      
      if (!data.text.trim()) {
        setError('Please enter a question text');
        setLoading(false);
        return;
      }
      
      // Ensure at least one option exists and has text
      if (data.options.length < 1 || !data.options[0].text.trim()) {
        setError('Please add at least one option with text');
        setLoading(false);
        return;
      }
      
      // Validate that only one option is marked as correct
      const correctOptions = data.options.filter(option => option.isCorrect);
      if (correctOptions.length !== 1) {
        setError('Please mark exactly one option as correct');
        setLoading(false);
        return;
      }
      
      // Clean up options data - remove any empty options
      const cleanedOptions = data.options.filter(option => option.text.trim() !== '');
      
      // Create the question
      await questionService.createQuestion({
        topic: data.topic,
        text: data.text,
        options: JSON.stringify(cleanedOptions),
        difficulty: data.difficulty,
        explanation: data.explanation || ''
      });
      
      setSuccess(true);
      reset({
        topic: '',
        text: '',
        options: [
          { id: '1', text: '', isCorrect: true },
        ],
        difficulty: 'medium',
        explanation: ''
      }); // Reset form after successful submission with a single option default
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionCorrectChange = (index: number) => {
    // This is handled by the radio button in the form
  };

  const addOption = () => {
    append({ id: `${fields.length + 1}`, text: '', isCorrect: false });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900">Please login to add questions</h2>
          <p className="mt-2 text-gray-600">You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-sky-500 px-6 py-4">
          <h1 className="text-xl font-bold text-white">Add New Question</h1>
        </div>
        
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
                  Question created successfully!
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
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Topic Selection */}
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-900">
              Topic <span className="text-red-500">*</span>
            </label>
            <select
              id="topic"
              {...register('topic', { required: 'Topic is required' })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md text-gray-900"
            >
              <option value="" className="text-gray-900">Select a topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id} className="text-gray-900">
                  {topic.name}
                </option>
              ))}
            </select>
            {errors.topic && (
              <p className="mt-1 text-sm text-red-600">{errors.topic.message}</p>
            )}
          </div>
          
          {/* Question Text */}
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-900">
              Question Text <span className="text-red-500">*</span>
            </label>
            <textarea
              id="text"
              rows={3}
              {...register('text', { required: 'Question text is required' })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-gray-900"
              placeholder="Enter your question here"
            />
            {errors.text && (
              <p className="mt-1 text-sm text-red-600">{errors.text.message}</p>
            )}
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
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`correct-${index}`}
                    className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-gray-300"
                    {...register(`options.${index}.isCorrect` as const)}
                  />
                  <input
                    type="text"
                    className="flex-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-gray-900"
                    placeholder={`Option ${index + 1}`}
                    {...register(`options.${index}.text` as const, { required: 'Option text is required' })}
                  />
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
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
              {...register('difficulty', { required: 'Difficulty is required' })}
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
              {...register('explanation')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
              placeholder="Explain why the correct answer is right (optional)"
            />
          </div>
          
          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 