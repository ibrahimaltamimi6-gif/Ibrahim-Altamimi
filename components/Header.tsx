
import React from 'react';
import { BookOpenIcon } from './icons/BookOpenIcon';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-900/50 backdrop-blur-sm shadow-lg shadow-purple-500/10 border-b border-gray-700/50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-center gap-3">
        <BookOpenIcon className="w-8 h-8 text-purple-400" />
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
          مولّد القصص بالذكاء الاصطناعي
        </h1>
      </div>
    </header>
  );
};

export default Header;
