
import React from 'react';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { LoadingSpinner } from './icons/LoadingSpinner';

interface PromptFormProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  tone: string;
  setTone: (tone: string) => void;
}

const storyTones = ['مغامرة', 'مضحكة', 'غامضة', 'درامية', 'شاعرية', 'تاريخي', 'خيال علمي', 'رعب', 'رومانسي'];

const PromptForm: React.FC<PromptFormProps> = ({ prompt, setPrompt, onSubmit, isLoading, tone, setTone }) => {
  return (
    <form onSubmit={onSubmit} className="w-full space-y-6">
      <div>
        <label htmlFor="prompt" className="block text-center text-lg font-medium text-gray-300 mb-2">
          بماذا تريد أن تكون قصتك؟
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="مثال: أميرة شجاعة تنقذ تنيناً من قرية غاضبة"
          rows={4}
          className="w-full p-4 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 resize-none placeholder-gray-500 text-white"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-center text-lg font-medium text-gray-300 mb-3">
          اختر طابع القصة
        </label>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {storyTones.map((toneValue) => (
            <button
              key={toneValue}
              type="button"
              onClick={() => setTone(toneValue)}
              disabled={isLoading}
              className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
                ${
                  tone === toneValue
                    ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {toneValue}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="w-5 h-5" />
            <span>جاري الكتابة...</span>
          </>
        ) : (
          <>
            <MagicWandIcon className="w-5 h-5" />
            <span>اكتب قصتي</span>
          </>
        )}
      </button>
    </form>
  );
};

export default PromptForm;
