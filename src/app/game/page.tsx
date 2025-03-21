'use client';

import { useState, useEffect } from 'react';
import { questionService } from '@/services/questionService';
import { topicService } from '@/services/topicService';
import Link from 'next/link';

// Types for our game
type CardType = {
  id: string;
  content: string;
  type: 'question' | 'answer';
  matched: boolean;
  flipped: boolean;
  questionId: string;
  selected: boolean;
};

// Option type
interface OptionType {
  id: string;
  text: string;
  isCorrect: boolean;
}

export default function MemoryGamePage() {
  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [pairCount, setPairCount] = useState(5);
  const [cards, setCards] = useState<CardType[]>([]);
  const [flippedCards, setFlippedCards] = useState<CardType[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingGame, setLoadingGame] = useState(false);

  // Load topics when the component mounts
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const fetchedTopics = await topicService.getTopics();
        setTopics(fetchedTopics);
        setLoading(false);
      } catch (error) {
        console.error('Error loading topics:', error);
        setError('Failed to load topics. Please try again.');
        setLoading(false);
      }
    };

    loadTopics();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameStarted && !gameCompleted) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStarted, gameCompleted]);

  // Check if the game is completed
  useEffect(() => {
    if (gameStarted && cards.length === 0 && !gameCompleted) {
      setGameCompleted(true);
    }
  }, [cards, gameStarted, gameCompleted]);

  // Handle card flips
  useEffect(() => {
    // If we have 2 selected cards, check if they match
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      
      // Check if the cards are a question-answer pair
      if (
        first.questionId === second.questionId && 
        first.type !== second.type
      ) {
        // Match! First highlight them as matched 
        setCards(prevCards => 
          prevCards.map(card => 
            card.id === first.id || card.id === second.id
              ? { ...card, matched: true, selected: false }
              : card
          )
        );
        
        // Then after a delay, make them disappear
        setTimeout(() => {
          setCards(prevCards => 
            prevCards.filter(card => 
              !(card.id === first.id || card.id === second.id)
            )
          );
        }, 800);
      } else {
        // Not a match, just deselect after a delay
        setTimeout(() => {
          setCards(prevCards => 
            prevCards.map(card => 
              card.id === first.id || card.id === second.id
                ? { ...card, selected: false }
                : card
            )
          );
        }, 1000);
      }
      
      // Clear selection after delay
      setTimeout(() => {
        setFlippedCards([]);
      }, 1000);
    }
  }, [flippedCards]);

  const startGame = async () => {
    if (!selectedTopic) {
      setError('Please select a topic');
      return;
    }

    setLoadingGame(true);
    setError('');
    
    try {
      // Get questions for the selected topic
      const questions = await questionService.getQuestionsByTopic(selectedTopic);
      
      // Filter questions by difficulty if needed
      const filteredQuestions = questions.filter(q => q.difficulty === difficultyLevel);
      
      // If not enough questions in the filtered set, use all questions
      const questionsToUse = filteredQuestions.length >= pairCount 
        ? filteredQuestions 
        : questions;
      
      // If still not enough questions, show error
      if (questionsToUse.length < pairCount) {
        setError(`Not enough questions available. Only ${questionsToUse.length} found.`);
        setLoadingGame(false);
        return;
      }
      
      // Shuffle and pick the number of questions we need
      const shuffledQuestions = [...questionsToUse].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffledQuestions.slice(0, pairCount);
      
      // Create card pairs (question and answer)
      const gamePairs: CardType[] = [];
      
      selectedQuestions.forEach(question => {
        // Add question card
        gamePairs.push({
          id: `q-${question.$id}`,
          content: question.text,
          type: 'question',
          matched: false,
          flipped: true, // Cards start face-up now
          questionId: question.$id || '',
          selected: false
        });
        
        // Find the correct answer
        const options = typeof question.options === 'string' 
          ? JSON.parse(question.options) 
          : question.options;
        
        const correctAnswer = options.find((opt: OptionType) => opt.isCorrect);
        
        // Add answer card
        gamePairs.push({
          id: `a-${question.$id}`,
          content: correctAnswer ? correctAnswer.text : 'No answer available',
          type: 'answer',
          matched: false,
          flipped: true, // Cards start face-up now
          questionId: question.$id || '',
          selected: false
        });
      });
      
      // Shuffle the cards for the game
      const shuffledPairs = [...gamePairs].sort(() => Math.random() - 0.5);
      
      // Reset game state and start
      setCards(shuffledPairs);
      setFlippedCards([]);
      setTimer(0);
      setGameStarted(true);
      setGameCompleted(false);
      setLoadingGame(false);
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Failed to start the game. Please try again.');
      setLoadingGame(false);
    }
  };

  const handleCardClick = (card: CardType) => {
    // Don't allow clicks on already matched cards
    if (card.matched) {
      return;
    }

    // If already selecting 2 cards, ignore further clicks
    if (flippedCards.length >= 2) {
      return;
    }
    
    // If clicking the same card that's already selected, deselect it
    if (flippedCards.length === 1 && flippedCards[0].id === card.id) {
      setFlippedCards([]);
      setCards(prevCards => 
        prevCards.map(c => 
          c.id === card.id ? { ...c, selected: false } : c
        )
      );
      return;
    }
    
    // Mark the card as selected
    setCards(prevCards => 
      prevCards.map(c => 
        c.id === card.id ? { ...c, selected: true } : c
      )
    );
    
    // Add to selected cards
    // Add to flipped cards
    setFlippedCards(prev => [...prev, card]);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameCompleted(false);
    setCards([]);
    setFlippedCards([]);
    setTimer(0);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Format timer as MM:SS
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {!gameStarted ? (
        // Game setup screen
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Question-Answer Matching Game
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Match each question with its correct answer by selecting them in pairs. All cards are face up - just find the matching pairs!
          </p>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          
          <div className="space-y-6">
            {/* Topic selection */}
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Topic
              </label>
              <select
                id="topic"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">-- Select a topic --</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Difficulty selection */}
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Difficulty
              </label>
              <select
                id="difficulty"
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value as 'easy' | 'medium' | 'hard')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            {/* Pair count selection */}
            <div>
              <label htmlFor="pairs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Number of Pairs
              </label>
              <select
                id="pairs"
                value={pairCount}
                onChange={(e) => setPairCount(parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="3">3 pairs (Easy)</option>
                <option value="5">5 pairs (Medium)</option>
                <option value="8">8 pairs (Hard)</option>
                <option value="10">10 pairs (Very Hard)</option>
              </select>
            </div>
            
            <button
              onClick={startGame}
              disabled={loadingGame}
              className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
            >
              {loadingGame ? 'Setting up game...' : 'Start Game'}
            </button>
          </div>
        </div>
      ) : (
        // Game board
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Matching Game
            </h2>
            <div className="text-lg font-mono bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-100 px-3 py-1 rounded-md">
              Time: {formatTime(timer)}
            </div>
          </div>
          
          {gameCompleted ? (
            // Game completed screen
            <div className="text-center py-10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Congratulations!
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                You completed the game in {formatTime(timer)}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={resetGame}
                  className="py-2 px-4 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  Play Again
                </button>
                <Link 
                  href="/" 
                  className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  Return Home
                </Link>
              </div>
            </div>
          ) : (
            // Game in progress
            <>
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300">
                <p className="text-sm">Select a question card and then its matching answer card to make a pair.</p>
              </div>
              
              {/* Card grid - responsive layout based on number of cards */}
              <div className={`grid gap-4 ${
                cards.length <= 10 
                  ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5' 
                  : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6'
              }`}>
                {cards.map(card => (
                  <div 
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    className={`
                      aspect-[3/4] rounded-lg shadow-md cursor-pointer transition-all duration-200
                      ${card.matched ? 'ring-4 ring-green-500 dark:ring-green-400 scale-105 opacity-90' : ''}
                      ${card.selected ? 'ring-4 ring-yellow-500 dark:ring-yellow-400 scale-105 z-10 shadow-lg' : ''}
                      ${card.type === 'question' 
                        ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white' 
                        : 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'}
                    `}
                  >
                    <div className="p-4 text-center h-full flex flex-col justify-center">
                      <p className="text-sm sm:text-base font-medium break-words">
                        {card.content}
                      </p>
                      <div className="mt-2 text-xs italic opacity-75">
                        {card.type === 'question' ? 'Question' : 'Answer'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Matched: {pairCount - cards.length / 2} of {pairCount} pairs
                </p>
                <button
                  onClick={resetGame}
                  className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  Reset Game
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 