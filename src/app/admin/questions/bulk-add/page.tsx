'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { questionService } from '@/services/questionService';
import { topicService } from '@/services/topicService';
import { authService } from '@/services/authService';
import { Topic } from '@/types';

interface ParsedQuestion {
  text: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation?: string;
  originalNumber?: string;
}

export default function BulkAddQuestionsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

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

  const parseQuestions = (text: string): ParsedQuestion[] => {
    // Split text by numbered pattern (multi-digit numbers allowed) or Q: or Question:
    const questionBlocks = text.split(/(?:\d+\s*[\.\):]|Q:|Question:)/).filter(block => block.trim());
console.log(text,questionBlocks);
    return questionBlocks.map((block, blockIndex) => {
      const lines = block.split('\n').map(line => line.trim()).filter(line => line);
      let questionText = '';
      let originalNumber = '';
      let options: { id: string; text: string; isCorrect: boolean }[] = [];
      let explanation = '';
      let currentSection: 'question' | 'options' | 'explanation' = 'question';
      let hasCorrectAnswer = false;


      // If the first line contains a question pattern, process it
      if (lines.length > 0) {
        const firstLine = lines[0];
        const questionMatch = firstLine.match(/^(\d+[\.\):]|Q:|Question:)/);
        
        if (questionMatch) {
          originalNumber = questionMatch[0];
          questionText = firstLine.replace(/^(\d+[\.\):]|Q:|Question:)/, '').trim();
          currentSection = 'options';
        } else if (blockIndex > 0) {
          // If we couldn't extract a number but this isn't the first block, 
          // something might be wrong with the regex. Use blockIndex+1 as fallback.
          originalNumber = `${blockIndex+1}.`;
          questionText = firstLine;
          currentSection = 'options';
        }

        // Process remaining lines
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          
          // Check if this is an option line
          if (line.match(/^[A-Da-d][\)\.:]|^\([A-Da-d]\)/)) {
            currentSection = 'options';
            // Match options like "A)", "B.", "A:", "(A)", "a)", etc.
            const optionText = line.replace(/^[A-Da-d][\)\.:]\s*|^\([A-Da-d]\)\s*/, '').trim();
            const isCorrect = line.includes('(correct)') || line.includes('✓');
            
            if (isCorrect) {
              hasCorrectAnswer = true;
            }
            
            options.push({
              id: String(options.length + 1),
              text: optionText.replace(/\s*\(correct\)|\s*✓/, ''),
              isCorrect
            });
          } else if (line.startsWith('Explanation:') || line.startsWith('Exp:')) {
            currentSection = 'explanation';
            explanation = line.replace(/^(Explanation:|Exp:)/, '').trim();
          } else if (currentSection === 'explanation') {
            explanation += ' ' + line;
          } else if (currentSection === 'options' && line.match(/^\(([a-d])\)|^([a-d])\)/i)) {
            // Special handling for options in format (a) or a) without text - this indicates a multilingual option
            const optionId = line.match(/\(([a-d])\)|([a-d])\)/i)?.[1] || line.match(/\(([a-d])\)|([a-d])\)/i)?.[2] || '';
            const isCorrect = line.includes('(correct)') || line.includes('✓');
            
            if (isCorrect) {
              hasCorrectAnswer = true;
            }
            
            options.push({
              id: String(options.length + 1),
              text: line.replace(/^\([a-d]\)\s*|^[a-d]\)\s*/i, '').replace(/\s*\(correct\)|\s*✓/, ''),
              isCorrect
            });
          } else if (currentSection === 'options') {
            // If we're in options section but this line doesn't match an option pattern,
            // it might be the continuation of the question text or the continuation of the last option
            if (options.length > 0) {
              // Append to the last option
              options[options.length - 1].text += ' ' + line;
            } else {
              // Append to question text
              questionText += ' ' + line;
            }
          }
        }
      }

      // If no correct answer was marked, default the first option as correct
      // This will be adjustable in the preview
      if (options.length > 0 && !hasCorrectAnswer) {
        options[0].isCorrect = true;
      }

      return {
        text: questionText,
        options,
        explanation: explanation || undefined,
        originalNumber
      };
    });
  };

  const handleParsePreview = () => {
    const parsed = parseQuestions(bulkText);
    setParsedQuestions(parsed);
    setPreviewMode(true);
  };

  const setCorrectOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...parsedQuestions];
    // Reset all options for this question to false first
    updatedQuestions[questionIndex].options.forEach(opt => {
      opt.isCorrect = false;
    });
    // Set the selected option as correct
    updatedQuestions[questionIndex].options[optionIndex].isCorrect = true;
    setParsedQuestions(updatedQuestions);
  };

  const handleSubmit = async () => {
    if (!selectedTopic) {
      setError('Please select a topic');
      return;
    }

    // Validate each question has at least one option and exactly one correct answer
    for (let i = 0; i < parsedQuestions.length; i++) {
      if (parsedQuestions[i].options.length === 0) {
        setError(`Question ${i + 1} must have at least one option`);
        return;
      }
      const correctOptions = parsedQuestions[i].options.filter(opt => opt.isCorrect);
      if (correctOptions.length !== 1) {
        setError(`Question ${i + 1} must have exactly one correct answer`);
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      for (const question of parsedQuestions) {
        await questionService.createQuestion({
          topic: selectedTopic,
          text: question.text,
          options: JSON.stringify(question.options),
          difficulty,
          explanation: question.explanation || ''
        });
      }

      setSuccess(true);
      setBulkText('');
      setParsedQuestions([]);
      setPreviewMode(false);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create questions');
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-xl font-bold text-white">Bulk Add Questions</h1>
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
                <p className="text-sm text-green-700">Questions created successfully!</p>
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
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
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
              <option value="">Select a topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

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
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label htmlFor="bulkText" className="block text-sm font-medium text-gray-900">
              Paste Questions and Answers
            </label>
            <p className="mt-1 text-sm text-gray-600">
              Format: Start each question with "Q:", "Question:", a number like "1." or "1)", etc.
              Mark options with "A)", "B)", etc., mark correct answers with "(correct)" or "✓".
              You can add just one option if needed. Add explanations with "Explanation:" or "Exp:"
            </p>
            <div className="mt-2 bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Example formats:</p>
              <pre className="mt-2 text-sm text-gray-600">
{`Q: What is the capital of France?
A) Paris (correct)

1. Which planet is known as the Red Planet?
(A) Mars ✓
Exp: Mars appears red due to iron oxide on its surface.

25) Who painted the Mona Lisa?
a) Da Vinci (correct)
Explanation: Leonardo Da Vinci painted the Mona Lisa between 1503 and 1519.

123. What is the largest ocean on Earth?
A) Pacific Ocean (correct)
B) Atlantic Ocean
C) Indian Ocean
D) Arctic Ocean
Explanation: The Pacific Ocean is the largest and deepest ocean on Earth.`}
              </pre>
            </div>
            <textarea
              id="bulkText"
              rows={10}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="mt-4 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-gray-900"
              placeholder="Paste your questions here..."
            />
          </div>

          {!previewMode ? (
            <button
              type="button"
              onClick={handleParsePreview}
              disabled={!bulkText.trim()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
            >
              Preview Parsed Questions
            </button>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Preview</h3>
              {parsedQuestions.map((q, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-md">
                  <p className="font-medium text-gray-900">
                    {q.originalNumber ? q.originalNumber : `Question ${idx + 1}:`} {q.text}
                  </p>
                  <fieldset className="mt-4">
                    <legend className="sr-only">Options</legend>
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center">
                          <input
                            id={`question-${idx}-option-${optIdx}`}
                            name={`question-${idx}-options`}
                            type="radio"
                            checked={opt.isCorrect}
                            onChange={() => setCorrectOption(idx, optIdx)}
                            className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-gray-300"
                          />
                          <label 
                            htmlFor={`question-${idx}-option-${optIdx}`} 
                            className={`ml-3 block text-sm font-medium ${
                              opt.isCorrect ? 'text-green-600 font-semibold' : 'text-gray-700'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}) {opt.text} 
                            {opt.isCorrect && ' ✓'}
                          </label>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                  {q.explanation && (
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Explanation:</span> {q.explanation}
                    </p>
                  )}
                </div>
              ))}
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !selectedTopic}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
                >
                  {loading ? 'Creating Questions...' : 'Create All Questions'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 