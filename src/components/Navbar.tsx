'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/services/authService';
import { User } from '@/types';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Refs to detect clicks outside the dropdowns
  const resourcesMenuRef = useRef<HTMLDivElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    };
    
    checkAuth();
    
    // Add event listener to close dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      // Close resources menu if click is outside
      if (
        resourcesMenuRef.current && 
        !resourcesMenuRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
      
      // Close avatar dropdown if click is outside
      if (
        avatarMenuRef.current && 
        !avatarMenuRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    
    // Add click event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setIsDropdownOpen(false);
  };
  
  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-sky-500 fixed w-full z-10 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-white font-bold text-xl">
                GK Master
              </Link>
            </div>
          </div>
          
          {/* Desktop menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/" className="text-white hover:bg-sky-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium" onClick={closeMenus}>
                Home
              </Link>
              <Link href="/review" className="text-white hover:bg-sky-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium" onClick={closeMenus}>
                Daily Review
              </Link>
              <Link href="/test" className="text-white hover:bg-sky-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium" onClick={closeMenus}>
                Take a Test
              </Link>
              <Link href="/game" className="text-white hover:bg-sky-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium" onClick={closeMenus}>
                Matching Game
              </Link>
              <div className="relative" ref={resourcesMenuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-white hover:bg-sky-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <span>Resources</span>
                  <svg className="ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <Link href="/admin/questions/add" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sky-50" onClick={closeMenus}>
                        Add Question
                      </Link>
                      <Link href="/admin/questions/bulk-add" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sky-50" onClick={closeMenus}>
                        Bulk Add Questions
                      </Link>
                      <Link href="/admin/questions/manage" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sky-50" onClick={closeMenus}>
                        Manage Questions
                      </Link>
                      <Link href="/topics" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sky-50" onClick={closeMenus}>
                        Browse Topics
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* User avatar or login button */}
            <div className="ml-4 flex items-center">
              {user ? (
                <div className="relative" ref={avatarMenuRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                  >
                    <div className="h-8 w-8 rounded-full bg-sky-400 flex items-center justify-center text-white font-bold">
                      {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <div className="block px-4 py-2 text-sm text-gray-700 border-b">
                          {user.name || user.email}
                        </div>
                        <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-sky-50" onClick={closeMenus}>
                          Your Profile
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-sky-50"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Link href="/auth/login" className="bg-white text-sky-600 hover:bg-sky-50 px-3 py-2 rounded-md text-sm font-medium" onClick={closeMenus}>
                    Login
                  </Link>
                  <Link href="/auth/register" className="bg-sky-600 text-white hover:bg-sky-700 px-3 py-2 rounded-md text-sm font-medium" onClick={closeMenus}>
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Link href="/" className="text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium" onClick={closeMenus}>
            Home
          </Link>
          <Link href="/review" className="text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium" onClick={closeMenus}>
            Daily Review
          </Link>
          <Link href="/test" className="text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium" onClick={closeMenus}>
            Take a Test
          </Link>
          <Link href="/game" className="text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium" onClick={closeMenus}>
            Matching Game
          </Link>
          <Link href="/admin/questions/add" className="text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium" onClick={closeMenus}>
            Add Question
          </Link>
          <Link href="/admin/questions/bulk-add" className="text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium" onClick={closeMenus}>
            Bulk Add Questions
          </Link>
          <Link href="/admin/questions/manage" className="text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium" onClick={closeMenus}>
            Manage Questions
          </Link>
          <Link href="/topics" className="text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium" onClick={closeMenus}>
            Browse Topics
          </Link>
          
          {user ? (
            <>
              <div className="border-t border-sky-700 my-2"></div>
              <div className="px-3 py-2 text-white font-medium">
                {user.name || user.email}
              </div>
              <Link href="/profile" className="text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium" onClick={closeMenus}>
                Your Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="border-t border-sky-700 my-2"></div>
              <Link href="/auth/login" className="text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium" onClick={closeMenus}>
                Login
              </Link>
              <Link href="/auth/register" className="text-white hover:bg-sky-700 block px-3 py-2 rounded-md text-base font-medium" onClick={closeMenus}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
} 