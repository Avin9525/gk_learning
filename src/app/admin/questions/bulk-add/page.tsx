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

interface ParsingConfig {
  questionPrefixes: string[];
  optionPrefixes: string[];
  correctAnswerMarkers: string[];
  explanationPrefixes: string[];
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
  
  // Parsing configuration
  const [parsingConfig, setParsingConfig] = useState<ParsingConfig>({
    questionPrefixes: ['Q:', 'Question:', '\\d+\\.', '\\d+\\)', '\\d+\\s'],
    optionPrefixes: ['[A-Za-z]\\)', '\\([A-Za-z]\\)', '[A-Za-z]\\]', '[A-Za-z]\\s?[-.]'],
    correctAnswerMarkers: ['(correct)', '✓', '\\*', '(right)', '(true)'],
    explanationPrefixes: ['Explanation:', 'Exp:']
  });
  
  const [showParsingOptions, setShowParsingOptions] = useState(false);
  const [customQuestionPrefix, setCustomQuestionPrefix] = useState('');
  const [customOptionPrefix, setCustomOptionPrefix] = useState('');
  const [customCorrectMarker, setCustomCorrectMarker] = useState('');
  const [customExplanationPrefix, setCustomExplanationPrefix] = useState('');

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

  const addCustomParsingOption = (type: keyof ParsingConfig) => {
    const updatedConfig = { ...parsingConfig };
    
    if (type === 'questionPrefixes' && customQuestionPrefix) {
      updatedConfig.questionPrefixes = [...updatedConfig.questionPrefixes, customQuestionPrefix];
      setCustomQuestionPrefix('');
    } else if (type === 'optionPrefixes' && customOptionPrefix) {
      updatedConfig.optionPrefixes = [...updatedConfig.optionPrefixes, customOptionPrefix];
      setCustomOptionPrefix('');
    } else if (type === 'correctAnswerMarkers' && customCorrectMarker) {
      updatedConfig.correctAnswerMarkers = [...updatedConfig.correctAnswerMarkers, customCorrectMarker];
      setCustomCorrectMarker('');
    } else if (type === 'explanationPrefixes' && customExplanationPrefix) {
      updatedConfig.explanationPrefixes = [...updatedConfig.explanationPrefixes, customExplanationPrefix];
      setCustomExplanationPrefix('');
    }
    
    setParsingConfig(updatedConfig);
  };
  
  const removeParsingOption = (type: keyof ParsingConfig, index: number) => {
    const updatedConfig = { ...parsingConfig };
    updatedConfig[type] = updatedConfig[type].filter((_, i) => i !== index);
    setParsingConfig(updatedConfig);
  };

  const parseQuestions = (text: string): ParsedQuestion[] => {
    // Create the dynamic regex patterns from the configuration
    const questionPrefixPattern = parsingConfig.questionPrefixes.join('|');
    const optionPrefixPattern = parsingConfig.optionPrefixes.join('|');
    
    // Escape special regex characters in the correct answer markers
    const correctAnswerMarkersPattern = parsingConfig.correctAnswerMarkers.map(marker => 
      marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    ).join('|');
    
    const explanationPrefixPattern = parsingConfig.explanationPrefixes.join('|');
    
    // Prepare patterns
    const questionRegex = new RegExp(`(^|\\n)(${questionPrefixPattern})\\s*(.+)`, 'gm');
    const optionRegex = new RegExp(`^(${optionPrefixPattern})\\s*(.+)`, 'i');
    const correctOptionRegex = new RegExp(`(${correctAnswerMarkersPattern})`, 'i');
    const explanationRegex = new RegExp(`^(${explanationPrefixPattern})\\s*(.+)`, 'i');
    
    // Step 1: Extract question blocks
    // Split the text by question patterns
    let questions: ParsedQuestion[] = [];
    
    // First, split the text into question blocks
    // Add a newline before each question marker if one doesn't already exist
    let preparedText = text;
    for (const prefix of parsingConfig.questionPrefixes) {
      // Don't add newline before the very first question
      const escapedPrefix = prefix.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      preparedText = preparedText.replace(
        new RegExp(`([^\\n])(${escapedPrefix})`, 'g'), 
        '$1\n$2'
      );
    }
    
    // Find all question blocks using regex
    const questionMatches = Array.from(preparedText.matchAll(questionRegex));
    
    if (questionMatches.length === 0) {
      // If no question patterns found, treat the entire text as one question
      const singleQuestion = parseQuestionBlock(preparedText);
      if (singleQuestion) {
        questions.push(singleQuestion);
      }
    } else {
      // Process each matched question block
      for (let i = 0; i < questionMatches.length; i++) {
        const match = questionMatches[i];
        const questionPrefix = match[2];
        const questionStart = match[0].trimStart();
        const startIndex = match.index + match[1].length;
        
        // Find the end of this question (start of next question or end of text)
        let endIndex = preparedText.length;
        if (i < questionMatches.length - 1) {
          endIndex = questionMatches[i + 1].index;
        }
        
        // Extract the full question block (includes question text, options, explanation)
        const fullQuestionBlock = preparedText.substring(startIndex, endIndex);
        
        // Parse the question block
        const parsedQuestion = parseQuestionBlock(fullQuestionBlock);
        
        if (parsedQuestion) {
          // Set the original question number/identifier
          parsedQuestion.originalNumber = questionPrefix;
          questions.push(parsedQuestion);
        }
      }
    }
    
    return questions;
    
    // Helper function to parse a single question block
    function parseQuestionBlock(block: string): ParsedQuestion | null {
      const lines = block.split('\n').map(line => line.trim()).filter(line => line);
      if (lines.length === 0) return null;
      
      // The first line contains the question and potentially the question marker
      let firstLine = lines[0];
      let questionText = firstLine;
      
      // Extract the question text
      const questionMatch = firstLine.match(new RegExp(`^(${questionPrefixPattern})\\s*(.+)`, 'i'));
      if (questionMatch) {
        questionText = questionMatch[2].trim();
      }
      
      const parsedQuestion: ParsedQuestion = {
        text: questionText,
        options: [],
        originalNumber: ''
      };
      
      // Process the remaining lines for options and explanation
      let currentSection: 'question' | 'options' | 'explanation' = 'options';
      let explanationText = '';
      let foundCorrectOption = false;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this is an explanation line
        if (explanationRegex.test(line)) {
          currentSection = 'explanation';
          explanationText = line.replace(explanationRegex, '$2').trim();
          continue;
        }
        
        // If we're already processing explanation, append to it
        if (currentSection === 'explanation') {
          explanationText += ' ' + line;
          continue;
        }
        
        // Check if this is an option
        const optionMatch = line.match(optionRegex);
        if (optionMatch) {
          // Extract option text and check if it's marked as correct
          let optionText = optionMatch[2].trim();
          const isCorrect = correctOptionRegex.test(optionText) && !foundCorrectOption;
          
          // If this option is correct, mark that we've found our correct option
          if (isCorrect) {
            foundCorrectOption = true;
          }
          
          // Remove the correct answer marker from the option text
          if (correctOptionRegex.test(optionText)) {
            optionText = optionText.replace(correctOptionRegex, '').trim();
          }
          
          parsedQuestion.options.push({
            id: `option-${parsedQuestion.options.length}`,
            text: optionText,
            isCorrect: isCorrect
          });
        } else {
          // If not an option but not clearly an explanation, 
          // it could be a continuation of the question or unlabeled option
          if (parsedQuestion.options.length === 0) {
            // If no options yet, assume it's part of the question
            parsedQuestion.text += ' ' + line;
          } else {
            // Otherwise check if it could be an explanation
            if (line.toLowerCase().includes('explanation') || line.toLowerCase().includes('exp:')) {
              currentSection = 'explanation';
              explanationText = line.replace(/^(explanation|exp):/i, '').trim();
            } else {
              // Could be a continuation of the last option
              const lastOption = parsedQuestion.options[parsedQuestion.options.length - 1];
              lastOption.text += ' ' + line;
              
              // Check if this additional text makes it a correct option
              if (correctOptionRegex.test(line) && !foundCorrectOption) {
                foundCorrectOption = true;
                lastOption.isCorrect = true;
                lastOption.text = lastOption.text.replace(correctOptionRegex, '').trim();
              } else if (correctOptionRegex.test(line)) {
                // If we already have a correct option, just remove the marker
                lastOption.text = lastOption.text.replace(correctOptionRegex, '').trim();
              }
            }
          }
        }
      }
      
      // Add the explanation if one was found
      if (explanationText) {
        parsedQuestion.explanation = explanationText;
      }
      
      // If there are no options with correct answer, mark the first one as correct by default
      if (parsedQuestion.options.length > 0 && !foundCorrectOption) {
        parsedQuestion.options[0].isCorrect = true;
      }
      
      return parsedQuestion;
    }
  };

  const handleParsePreview = () => {
    if (!bulkText.trim()) {
      setError('Please enter some text to parse.');
      return;
    }
    
    try {
      setError('');
      const questions = parseQuestions(bulkText);
      
      if (questions.length === 0) {
        setError('No questions could be parsed from the text. Please check your formatting.');
        return;
      }
      
      // Make sure each question has at least 2 options
      questions.forEach(question => {
        if (question.options.length < 1) {
          // Add default options if none were found
          question.options.push({
            id: `option-0`,
            text: 'Add your option here',
            isCorrect: true
          });
        }
      });
      
      setParsedQuestions(questions);
      setPreviewMode(true);
    } catch (error) {
      console.error('Error parsing questions:', error);
      setError('Error parsing questions. Please check your formatting.');
    }
  };

  const setCorrectOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...parsedQuestions];
    
    // Get the current question
    const currentQuestion = updatedQuestions[questionIndex];
    
    if (currentQuestion) {
      // Mark all options as not correct
      currentQuestion.options.forEach(opt => (opt.isCorrect = false));
      
      // Mark the selected option as correct
      currentQuestion.options[optionIndex].isCorrect = true;
      
      // Update the questions
      setParsedQuestions(updatedQuestions);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTopic) {
      setError('Please select a topic');
      return;
    }

    if (parsedQuestions.length === 0) {
      setError('No questions to submit');
      return;
    }
    
    // Validate each question has exactly one correct answer
    for (let i = 0; i < parsedQuestions.length; i++) {
      const question = parsedQuestions[i];
      const correctOptions = question.options.filter(opt => opt.isCorrect);
      
      if (correctOptions.length === 0) {
        setError(`Question ${i + 1} has no correct answer selected. Please mark one option as correct.`);
        return;
      }
      
      if (correctOptions.length > 1) {
        // Auto-fix: keep only the first correct option
        const updatedQuestions = [...parsedQuestions];
        const firstCorrectIndex = question.options.findIndex(opt => opt.isCorrect);
        
        // Set all options to not correct
        updatedQuestions[i].options.forEach(opt => opt.isCorrect = false);
        
        // Set only the first one as correct
        updatedQuestions[i].options[firstCorrectIndex].isCorrect = true;
        
        setParsedQuestions(updatedQuestions);
        setError(`Fixed question ${i + 1} to have exactly one correct answer.`);
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Prepare questions for submission
      const questions = parsedQuestions.map(q => ({
        text: q.text,
        options: q.options,
        explanation: q.explanation || '',
        topicId: selectedTopic,
        difficulty: difficulty
      }));

      // Submit questions
      await questionService.createBulkQuestions(questions);
      
      // Reset form
      setBulkText('');
      setParsedQuestions([]);
      setPreviewMode(false);
      setSuccess(true);
      
      // Scroll to top to show success message
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Error creating questions:', error);
      setError('Failed to create questions. Please try again.');
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

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-gray-900">Parsing Configuration</h3>
              <button
                type="button"
                onClick={() => setShowParsingOptions(!showParsingOptions)}
                className="text-sky-600 hover:text-sky-800 text-sm flex items-center"
              >
                {showParsingOptions ? 'Hide Options' : 'Show Options'}
                <svg
                  className={`ml-1 h-5 w-5 transform ${showParsingOptions ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {showParsingOptions && (
              <div className="space-y-4">
                {/* Question Prefixes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Start Patterns
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {parsingConfig.questionPrefixes.map((prefix, index) => (
                      <div
                        key={`q-prefix-${index}`}
                        className="bg-sky-100 text-sky-800 px-2 py-1 rounded-md text-xs flex items-center"
                      >
                        <span className="mr-1">{prefix}</span>
                        <button
                          type="button"
                          onClick={() => removeParsingOption('questionPrefixes', index)}
                          className="text-sky-600 hover:text-sky-800"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={customQuestionPrefix}
                      onChange={(e) => setCustomQuestionPrefix(e.target.value)}
                      placeholder="Add custom pattern"
                      className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomParsingOption('questionPrefixes')}
                      disabled={!customQuestionPrefix}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-r-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Examples: "Q:", "Question:", "\d+\." (for "1."), "\d+\)" (for "1)")
                  </p>
                </div>

                {/* Option Prefixes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Answer Option Patterns
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {parsingConfig.optionPrefixes.map((prefix, index) => (
                      <div
                        key={`o-prefix-${index}`}
                        className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-md text-xs flex items-center"
                      >
                        <span className="mr-1">{prefix}</span>
                        <button
                          type="button"
                          onClick={() => removeParsingOption('optionPrefixes', index)}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={customOptionPrefix}
                      onChange={(e) => setCustomOptionPrefix(e.target.value)}
                      placeholder="Add custom pattern"
                      className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomParsingOption('optionPrefixes')}
                      disabled={!customOptionPrefix}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-r-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Examples: "[A-Za-z]\)" (for "A)"), "\([A-Za-z]\)" (for "(A)")
                  </p>
                </div>

                {/* Correct Answer Markers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct Answer Markers
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {parsingConfig.correctAnswerMarkers.map((marker, index) => (
                      <div
                        key={`c-marker-${index}`}
                        className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs flex items-center"
                      >
                        <span className="mr-1">{marker}</span>
                        <button
                          type="button"
                          onClick={() => removeParsingOption('correctAnswerMarkers', index)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={customCorrectMarker}
                      onChange={(e) => setCustomCorrectMarker(e.target.value)}
                      placeholder="Add custom marker"
                      className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomParsingOption('correctAnswerMarkers')}
                      disabled={!customCorrectMarker}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-r-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Examples: "(correct)", "✓", "(right)", "(true)"
                  </p>
                </div>

                {/* Explanation Prefixes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explanation Patterns
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {parsingConfig.explanationPrefixes.map((prefix, index) => (
                      <div
                        key={`e-prefix-${index}`}
                        className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-xs flex items-center"
                      >
                        <span className="mr-1">{prefix}</span>
                        <button
                          type="button"
                          onClick={() => removeParsingOption('explanationPrefixes', index)}
                          className="text-amber-600 hover:text-amber-800"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={customExplanationPrefix}
                      onChange={(e) => setCustomExplanationPrefix(e.target.value)}
                      placeholder="Add custom pattern"
                      className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomParsingOption('explanationPrefixes')}
                      disabled={!customExplanationPrefix}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-r-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Examples: "Explanation:", "Exp:"
                  </p>
                </div>
              </div>
            )}
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