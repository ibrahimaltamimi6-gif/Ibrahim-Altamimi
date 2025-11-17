import React from 'react';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { KeyIcon } from './icons/KeyIcon';

interface HeaderProps {
    onApiKeyClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onApiKeyClick }) => {
  return (
    <header className="bg-gray-900/50 backdrop-blur-sm shadow-lg shadow-purple-500/10 border-b border-gray-700/50 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <BookOpenIcon className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            مولّد القصص بالذكاء الاصطناعي
            </h1>
        </div>
        <button 
            onClick={onApiKeyClick} 
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md border-2 transition-all duration-200 bg-gray-700/80 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
            aria-label="Manage API Key"
        >
            <KeyIcon className="w-4 h-4" />
            <span>مفتاح API</span>
        </button>
      </div>
    </header>
  );
};

export default Header;