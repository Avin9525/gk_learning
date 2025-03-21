import { account, ID } from '@/lib/appwrite';
import { User } from '@/types';

export const authService = {
  // Register a new user
  async register(email: string, password: string, name?: string): Promise<User | null> {
    try {
      const userId = ID.unique();
      const user = await account.create(userId, email, password, name);
  
      console.log('User registered:', user);
  
      await account.createVerification(email);
      console.log('Verification email sent.');
  
      return user as User;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Registration error:', error.message);
        throw new Error(error.message);
      }
      throw new Error('An unknown error occurred during registration.');
    }
  },
  
  
  // Login a user
  async login(email: string, password: string): Promise<User | null> {
    try {
      // First try to get the current user to check if already logged in
      try {
        const currentUser = await account.get();
        if (currentUser) {
          return currentUser as unknown as User;
        }
      } catch (e) {
        // Not logged in, continue with login process
      }

      // Create session
      const session = await account.createEmailPasswordSession(email, password);
      
      if (!session) {
        throw new Error('Failed to create session');
      }

      // Get user details after successful session creation
      const user = await account.get();
      return user as unknown as User;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 401) {
        throw new Error('Invalid email or password');
      } else if (error.code === 409) {
        throw new Error('Email not verified. Please check your inbox.');
      } else if (error.code === 429) {
        throw new Error('Too many attempts. Please try again later.');
      } else {
        throw new Error(error.message || 'An error occurred during login');
      }
    }
  },
  
  // Logout the current user
  async logout(): Promise<boolean> {
    try {
      await account.deleteSession('current');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  },
  
  // Get the currently authenticated user
  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await account.get();
      return user as unknown as User;
    } catch (error) {
      return null;
    }
  },
  
  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error) {
      return false;
    }
  }
}; 