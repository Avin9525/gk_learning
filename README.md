# GK Master - Spaced Repetition Learning App

A General Knowledge learning application with spaced repetition to help you remember what you learn. Built with Next.js and Appwrite.

## Features

- **Topic-based Learning**: Questions organized by subject area
- **Spaced Repetition System**: Smart algorithm to optimize review frequency
- **Progress Tracking**: Track mastery levels for each question
- **User Authentication**: Secure login and registration
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Appwrite (Authentication, Database)
- **State Management**: React Hooks
- **Forms**: React Hook Form

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Appwrite account

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/gk-master.git
cd gk-master
```

2. Install dependencies
```bash
npm install
```

3. Set up your Appwrite account and create:
   - A new project
   - A database
   - Collections for questions and user progress
   - Authentication with email/password enabled

4. Update the `.env` file with your Appwrite credentials:
```
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_QUESTION_COLLECTION_ID=your-question-collection-id
NEXT_PUBLIC_APPWRITE_USER_PROGRESS_COLLECTION_ID=your-user-progress-collection-id
```

5. Run the development server
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `src/app`: Next.js routes and pages
- `src/components`: Reusable UI components
- `src/lib`: Configuration and utilities
- `src/services`: API service integrations
- `src/types`: TypeScript type definitions

## Appwrite Setup

### Collections & Attributes

#### Questions Collection
- `topic` (string, required) - The topic category of the question
- `text` (string, required) - The question text
- `options` (string, required) - JSON string of options array
- `difficulty` (enum, required) - Question difficulty (easy, medium, hard)
- `explanation` (string) - Optional explanation for the answer

#### User Progress Collection
- `userId` (string, required) - The user's ID
- `questionId` (string, required) - The question's ID
- `correct` (boolean, required) - Whether the last attempt was correct
- `lastAttempted` (datetime, required) - When the question was last attempted
- `attemptsCount` (integer, required) - Number of attempts
- `consecutiveCorrect` (integer, required) - Number of consecutive correct answers
- `masteryLevel` (string, required) - Current mastery level (new, learning, review, mastered)

### Indexes
For the User Progress collection:
- Create an index for `userId` and `questionId` combined
- Create another index for `userId` and `masteryLevel`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
