import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { ShareIcon } from './icons/ShareIcon';
import { PencilIcon } from './icons/PencilIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';

interface StoryDisplayProps {
  story: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * A helper function to parse inline markdown (bold and italics).
 * @param text The string to parse.
 * @param keyPrefix A unique prefix for the keys.
 * @returns An array of React elements.
 */
const parseInlineMarkdown = (text: string, keyPrefix: string) => {
  const regex = /(\*\*.*?\*\*)|(\*.*?\*)/g;
  const parts = text.split(regex).filter(Boolean);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-strong-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${keyPrefix}-em-${index}`}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={`${keyPrefix}-text-${index}`}>{part}</React.Fragment>;
  });
};

/**
 * A safe parser that converts a Markdown string with bold, italics,
 * blockquotes, and lists into React elements.
 * @param text The string to parse.
 * @returns An array of React elements.
 */
const parseMarkdownContent = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-outside my-4 mr-6">{listItems}</ul>);
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('>')) {
      flushList();
      const content = trimmedLine.substring(1).trim();
      elements.push(
        <blockquote key={`bq-${index}`} className="border-r-4 border-purple-500 pr-4 my-4 italic text-gray-400">
          {parseInlineMarkdown(content, `bq-${index}`)}
        </blockquote>
      );
    } else if (trimmedLine.startsWith('* ')) {
      const content = trimmedLine.substring(1).trim();
      listItems.push(
        <li key={`li-${index}`} className="mb-1">
          {parseInlineMarkdown(content, `li-${index}`)}
        </li>
      );
    } else {
      flushList();
      if (trimmedLine.length > 0) {
        elements.push(
          <p key={`p-${index}`} className="my-3">
            {parseInlineMarkdown(trimmedLine, `p-${index}`)}
          </p>
        );
      }
    }
  });

  flushList();
  return elements;
};

interface Scene {
    title: string;
    content: string;
}

const parseStoryToScenes = (text: string): Scene[] => {
    if (!text.trim()) return [];

    const scenes: Scene[] = [];
    const sceneBlocks = text.split(/(?=\*\*المشهد \d+:[^\*]+\*\*)/g).filter(block => block.trim());

    for (const block of sceneBlocks) {
        const lines = block.trim().split('\n');
        const title = lines.shift()?.trim().replace(/\*\*/g, '') || 'مشهد بدون عنوان';
        const content = lines.join('\n').trim();

        if (content) {
            scenes.push({ title, content });
        }
    }
    return scenes;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ story, isLoading, error }) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setIsCopied(false);
  }, [story]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(story);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('فشل نسخ القصة. يرجى المحاولة مرة أخرى.');
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-gray-400">
          <LoadingSpinner className="w-12 h-12 mb-4" />
          <p className="text-lg font-semibold">يقوم الذكاء الاصطناعي بحياكة قصة رائعة لك...</p>
          <p>قد يستغرق هذا بضع لحظات.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
          <strong className="font-bold">خطأ!</strong>
          <span className="block sm:inline ml-2">{error}</span>
          <div className="mt-4">
              <Link to="/" className="bg-gray-700 text-white font-bold py-2 px-4 rounded hover:bg-gray-600 transition-colors">
                  حاول مرة أخرى
              </Link>
          </div>
        </div>
      );
    }

    if (story) {
        const scenes = parseStoryToScenes(story);

        // Fallback for content that doesn't match the scene format
        if (scenes.length === 0) {
            return (
                <div className="prose prose-invert max-w-none text-right w-full">
                    <div className="text-gray-300 leading-loose">
                        {parseMarkdownContent(story)}
                    </div>
                </div>
            )
        }

      return (
        <div className="prose prose-invert max-w-none text-right w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 m-0">قصتك الرائعة</h2>
              <div className="flex items-center gap-2">
                <button
                    onClick={handleShare}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                    isCopied
                        ? 'bg-green-600 border-green-500 text-white'
                        : 'bg-gray-700/80 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                    }`}
                >
                    <ShareIcon className="w-4 h-4" />
                    <span>{isCopied ? 'تم النسخ!' : 'شارك القصة'}</span>
                </button>
                <Link
                    to="/"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md border-2 transition-all duration-200 bg-gray-700/80 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                    <PencilIcon className="w-4 h-4" />
                    <span>قصة جديدة</span>
                </Link>
              </div>
            </div>
            <div className="space-y-6">
                {scenes.map((scene, index) => (
                    <div key={index} className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-5 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
                        <h3 className="text-xl font-bold text-purple-400 mb-3">{scene.title}</h3>
                        <div className="text-gray-300 leading-loose">
                            {parseMarkdownContent(scene.content)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
    }

    return (
        <div className="text-center text-gray-500">
            <p className="mb-4">لم يتم إنشاء قصة بعد.</p>
            <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-500/50 transition-all duration-300">
                <MagicWandIcon className="w-5 h-5" />
                <span>ابدأ بإنشاء قصة جديدة</span>
            </Link>
        </div>
    );
  };
  
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 min-h-[250px] flex items-center justify-center transition-all duration-300">
      {renderContent()}
    </div>
  );
};

export default StoryDisplay;