import Link from 'next/link';
import { topicService } from '@/services/topicService';

export default async function Home() {
  const topics = await topicService.getTopics();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="bg-sky-500 text-white rounded-lg shadow-lg mb-10">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-4">
            Master General Knowledge
          </h1>
          <p className="max-w-xl mx-auto text-xl text-sky-100">
            Enhance your knowledge with our spaced repetition system designed to help you remember more effectively.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-md shadow">
              <Link
                href="/review"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-sky-600 bg-white hover:bg-sky-50"
              >
                Start Review
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link
                href="/test"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700"
              >
                Take a Test
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link
                href="/game"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Play Matching Game
              </Link>
            </div>
            <div className="ml-3 inline-flex">
              <Link
                href="/topics"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-sky-700 hover:bg-sky-800"
              >
                Browse Topics
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white rounded-lg shadow-lg mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold tracking-wide uppercase text-sky-600">Features</h2>
            <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              A smarter way to learn
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Our spaced repetition system adapts to your learning progress, focusing on what you need to review.
            </p>
          </div>

          <div className="mt-10">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="pt-6">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-8 bg-sky-50 border-b border-sky-200">
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-md bg-sky-500 text-white mx-auto flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h3 className="mt-5 text-lg font-medium text-gray-900">Smart Learning</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Our algorithm focuses on the questions you need to review the most.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-8 bg-sky-50 border-b border-sky-200">
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-md bg-sky-500 text-white mx-auto flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h3 className="mt-5 text-lg font-medium text-gray-900">Topic-Based Learning</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Focus on specific subjects or explore a variety of topics.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-8 bg-sky-50 border-b border-sky-200">
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-md bg-sky-500 text-white mx-auto flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="mt-5 text-lg font-medium text-gray-900">Track Progress</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Monitor your learning journey and see how you improve over time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-8 bg-indigo-50 border-b border-indigo-200">
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="mt-5 text-lg font-medium text-gray-900">Matching Game</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Enhance learning with our question-answer matching game that tests your knowledge.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Section */}
      <div className="py-12 bg-white rounded-lg shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold tracking-wide uppercase text-sky-600">Topics</h2>
            <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Explore Knowledge Areas
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Choose from a variety of topics to start practicing or reviewing.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200 transition transform hover:scale-105"
              >
                <div className="px-4 py-5 sm:p-6 bg-gradient-to-b from-sky-50 to-white">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    {topic.name}
                  </h3>
                  <p className="mt-3 text-sm text-gray-500">
                    {topic.description}
                  </p>
                  <div className="mt-4 flex items-center text-sm text-sky-600">
                    <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-sky-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    {topic.questionCount || 0} questions
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:px-6 border-t border-gray-200">
                  <Link
                    href={`/topics/${topic.id}`}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-sky-500 hover:bg-sky-600"
                  >
                    Start Practice
                    <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Test and Review Cards */}
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Test Card */}
            <div className="bg-sky-500 rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-8 md:p-10">
                <div>
                  <h3 className="text-2xl font-bold text-white">Take a GK Test</h3>
                  <p className="mt-2 text-sky-100">
                    Test your knowledge with a set of questions from your selected topic.
                  </p>
                </div>
                <div className="mt-6">
                  <Link
                    href="/test"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-sky-600 bg-white hover:bg-sky-50"
                  >
                    Start Test
                    <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Daily Review Card */}
            <div className="bg-sky-600 rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-8 md:p-10">
                <div>
                  <h3 className="text-2xl font-bold text-white">Ready for your daily review?</h3>
                  <p className="mt-2 text-sky-100">
                    Review questions based on your learning progress and spaced repetition algorithm.
                  </p>
                </div>
                <div className="mt-6">
                  <Link
                    href="/review"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-sky-600 bg-white hover:bg-sky-50"
                  >
                    Start Review
                    <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Memory Game Card */}
            <div className="bg-indigo-600 rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-8 md:p-10">
                <div>
                  <h3 className="text-2xl font-bold text-white">Question-Answer Challenge</h3>
                  <p className="mt-2 text-indigo-100">
                    Test your knowledge by matching questions with their correct answers in this educational game.
                  </p>
                </div>
                <div className="mt-6">
                  <Link
                    href="/game"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-600 bg-white hover:bg-indigo-50"
                  >
                    Play Game
                    <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
