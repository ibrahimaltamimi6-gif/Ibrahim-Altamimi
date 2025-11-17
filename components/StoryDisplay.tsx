import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { generateImage } from '../services/geminiService';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { ShareIcon } from './icons/ShareIcon';
import { PencilIcon } from './icons/PencilIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { ImageIcon } from './icons/ImageIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { RetryIcon } from './icons/RetryIcon';
import { WhatsappIcon } from './icons/WhatsappIcon';


interface StoryDisplayProps {
  story: string;
  isLoading: boolean;
  error: string | null;
  onSelectApiKey: () => void;
}

interface Character {
  name: string;
  description: string;
}
interface Shot {
  description: string;
}
interface Scene {
  title: string;
  content: string;
  shots: Shot[];
  characters: Character[];
}

type ImageQueueTask = {
    type: 'shot';
    payload: { shot: Shot; sceneIndex: number; shotIndex: number };
} | {
    type: 'character';
    payload: { character: Character };
};


// ... (parsing functions remain the same)
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

const parseMarkdownContent = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('>')) {
      elements.push(
        <blockquote key={`bq-${index}`} className="border-r-4 border-purple-500 pr-4 my-4 italic text-gray-400">
          {parseInlineMarkdown(trimmedLine.substring(1).trim(), `bq-${index}`)}
        </blockquote>
      );
    } else if (trimmedLine.length > 0) {
      elements.push(<p key={`p-${index}`} className="my-3">{parseInlineMarkdown(trimmedLine, `p-${index}`)}</p>);
    }
  });

  return elements;
};

const parseStoryToScenes = (text: string): Scene[] => {
    if (!text.trim()) return [];

    const scenes: Scene[] = [];
    const sceneRegex = /\*\*المشهد \d+:[^\*]+\*\*/;
    const sceneBlocks = text.split(new RegExp(`(?=${sceneRegex.source})`)).filter(block => block.trim());

    for (const block of sceneBlocks) {
        const titleMatch = block.match(sceneRegex);
        const title = titleMatch ? titleMatch[0].trim().replace(/\*\*/g, '') : 'مشهد بدون عنوان';

        const contentAndMeta = block.replace(sceneRegex, '').trim();
        const shotsParts = contentAndMeta.split(/\*\*اللقطات:\*\*/);
        if (shotsParts.length < 2) continue; 

        const narrativeContent = shotsParts[0].trim();
        const rest = shotsParts[1];

        const charParts = rest.split(/\*\*الشخصيات في هذا المشهد:\*\*/);
        const shotsBlock = charParts[0].trim();
        const charactersBlock = charParts.length > 1 ? charParts[1].trim() : '';

        const shots: Shot[] = [];
        const shotRegex = /-\s*\*\*اللقطة\s*\d+:\*\*\s*(.*)/g;
        let match;
        while ((match = shotRegex.exec(shotsBlock)) !== null) {
            shots.push({ description: match[1].trim() });
        }

        const characters: Character[] = [];
        if (charactersBlock && !/لا يوجد/i.test(charactersBlock)) {
            const charRegex = /-\s*\*\*(.*?):\*\*\s*(.*)/g;
            let charMatch;
            while ((charMatch = charRegex.exec(charactersBlock)) !== null) {
                characters.push({
                    name: charMatch[1].trim(),
                    description: charMatch[2].trim()
                });
            }
        }
        
        scenes.push({ title, content: narrativeContent, shots, characters });
    }

    if (scenes.length === 0 && text.trim()) {
        return [{ title: 'القصة الكاملة', content: text, shots: [], characters: [] }];
    }

    return scenes;
};


const StoryDisplay: React.FC<StoryDisplayProps> = ({ story, isLoading, error, onSelectApiKey }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  
  // Image states
  const [characterImages, setCharacterImages] = useState<Record<string, string>>({});
  const [charImageStates, setCharImageStates] = useState<Record<string, { state: 'loading' | 'loaded' | 'error', error?: string }>>({});
  const [shotImages, setShotImages] = useState<Record<string, string>>({});
  const [shotImageStates, setShotImageStates] = useState<Record<string, { state: 'loading' | 'loaded' | 'error', error?: string }>>({});
  
  // Editing states
  const [editingCharacterName, setEditingCharacterName] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  
  const imageQueue = useRef<ImageQueueTask[]>([]);
  const isProcessingQueue = useRef(false);

  const ensureApiKey = async () => {
    const hasApiKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasApiKey) {
      await (window as any).aistudio.openSelectKey();
    }
  };

  const handleUpdateCharacterDescription = useCallback(async (characterName: string, newDescription: string) => {
    const newScenes = scenes.map(scene => ({
      ...scene,
      characters: scene.characters.map(character => 
        character.name === characterName ? { ...character, description: newDescription } : character
      ),
    }));
    setScenes(newScenes);
    setEditingCharacterName(null);
    setEditText('');

    try {
      setCharImageStates(prev => ({ ...prev, [characterName]: { state: 'loading' } }));
      await ensureApiKey();
      const imageUrl = await generateImage(newDescription);
      setCharacterImages(prev => ({ ...prev, [characterName]: imageUrl }));
      setCharImageStates(prev => ({ ...prev, [characterName]: { state: 'loaded' } }));
    } catch (err: any) {
      console.error(`Failed to regenerate image for ${characterName}:`, err);
      setCharImageStates(prev => ({ ...prev, [characterName]: { state: 'error', error: err.message } }));
      if (err.message && err.message.includes("صالح")) {
        onSelectApiKey();
      }
    }
  }, [scenes, onSelectApiKey]);
  
  const handleGenerateShotImage = useCallback(async (shot: Shot, sceneIndex: number, shotIndex: number) => {
      const key = `${sceneIndex}-${shotIndex}`;
      if (!shot.description?.trim()) {
        console.warn(`Skipping image generation for shot ${shotIndex + 1} in scene ${sceneIndex + 1} due to empty description.`);
        setShotImageStates(prev => ({ ...prev, [key]: { state: 'error', error: 'الوصف فارغ.' } }));
        return;
      }
      try {
        setShotImageStates(prev => ({ ...prev, [key]: { state: 'loading' } }));
        await ensureApiKey();
        const imageUrl = await generateImage(shot.description);
        setShotImages(prev => ({ ...prev, [key]: imageUrl }));
        setShotImageStates(prev => ({ ...prev, [key]: { state: 'loaded' } }));
      } catch (err: any) {
        console.error(`Failed to generate image for shot ${shotIndex + 1} in scene ${sceneIndex + 1}:`, err);
        setShotImageStates(prev => ({ ...prev, [key]: { state: 'error', error: err.message } }));
        if (err.message && err.message.includes("صالح")) {
            onSelectApiKey();
        }
      }
  }, [onSelectApiKey]);
  
  const handleGenerateCharacterImage = useCallback(async (character: Character) => {
        const { name, description } = character;
        if (!description?.trim()) {
            console.warn(`Skipping image generation for ${name} due to empty description.`);
            setCharImageStates(prev => ({ ...prev, [name]: { state: 'error', error: 'الوصف فارغ.' } }));
            return;
        }
        try {
            setCharImageStates(prev => ({ ...prev, [name]: { state: 'loading' } }));
            await ensureApiKey();
            const imageUrl = await generateImage(description);
            setCharacterImages(prev => ({ ...prev, [name]: imageUrl }));
            setCharImageStates(prev => ({ ...prev, [name]: { state: 'loaded' } }));
        } catch (err: any) {
            console.error(`Failed to generate image for ${name}:`, err);
            setCharImageStates(prev => ({ ...prev, [name]: { state: 'error', error: err.message } }));
            if (err.message && err.message.includes("صالح")) {
                onSelectApiKey();
            }
        }
  }, [onSelectApiKey]);

    const processImageQueue = useCallback(async () => {
        if (imageQueue.current.length === 0) {
            isProcessingQueue.current = false;
            return;
        }
        isProcessingQueue.current = true;
        
        const task = imageQueue.current.shift();

        if (task) {
            if (task.type === 'shot') {
                await handleGenerateShotImage(task.payload.shot, task.payload.sceneIndex, task.payload.shotIndex);
            } else if (task.type === 'character') {
                await handleGenerateCharacterImage(task.payload.character);
            }
        }

        setTimeout(processImageQueue, 1000);

    }, [handleGenerateShotImage, handleGenerateCharacterImage]);

  useEffect(() => {
    if (story) {
      const parsedScenes = parseStoryToScenes(story);
      setScenes(parsedScenes);
      // Reset all states
      setCharacterImages({});
      setCharImageStates({});
      setShotImages({});
      setShotImageStates({});
      
      imageQueue.current = [];

      // Build the image generation queue
      const tasks: ImageQueueTask[] = [];
      parsedScenes.forEach((scene, sceneIndex) => {
        scene.shots.forEach((shot, shotIndex) => {
          tasks.push({ type: 'shot', payload: { shot, sceneIndex, shotIndex } });
        });
      });
      
      const uniqueCharacters = new Map<string, Character>();
      parsedScenes.forEach(scene => {
          scene.characters.forEach(character => {
              if (!uniqueCharacters.has(character.name)) {
                  uniqueCharacters.set(character.name, character);
                  tasks.push({ type: 'character', payload: { character } });
              }
          });
      });
      
      imageQueue.current = tasks;
      if (!isProcessingQueue.current) {
        processImageQueue();
      }

    } else {
      setScenes([]);
      imageQueue.current = [];
    }
     // Cleanup on component unmount or story change
    return () => {
        imageQueue.current = [];
    };
  }, [story, processImageQueue]);
  
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

  const handleShareToWhatsApp = () => {
    if (!story) return;
  
    const intro = "ألقِ نظرة على هذه القصة التي أنشأتها باستخدام مولّد القصص بالذكاء الاصطناعي:\n\n";
    const whatsappStory = story
        .replace(/\*\*(.*?)\*\*/g, '*$1*') 
        .replace(/\*(.*?)\*/g, '_$1_');

    const fullMessage = intro + whatsappStory;
    const encodedMessage = encodeURIComponent(fullMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
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

    if (scenes.length > 0) {
      return (
        <div className="prose prose-invert max-w-none text-right w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 m-0">قصتك الرائعة</h2>
              <div className="flex items-center gap-2">
                <button
                    onClick={handleShareToWhatsApp}
                    className="flex items-center justify-center p-2 text-sm font-semibold rounded-md border-2 transition-all duration-200 bg-gray-700/80 border-gray-600 text-gray-300 hover:text-green-400 hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500"
                    aria-label="مشاركة عبر واتساب"
                    title="مشاركة عبر واتساب"
                >
                    <WhatsappIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={handleShare}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                    isCopied
                        ? 'bg-green-600 border-green-500 text-white'
                        : 'bg-gray-700/80 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                    }`}
                >
                    <ShareIcon className="w-4 h-4" />
                    <span>{isCopied ? 'تم النسخ!' : 'نسخ القصة'}</span>
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
            <div className="space-y-8">
                {scenes.map((scene, sceneIndex) => (
                    <div key={sceneIndex} className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-5 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
                        <h3 className="text-xl font-bold text-purple-400 mb-3">{scene.title}</h3>
                        <div className="text-gray-300 leading-loose">
                            {parseMarkdownContent(scene.content)}
                        </div>

                        {scene.shots.length > 0 && (
                          <div className="mt-6">
                              <h4 className="font-bold text-lg text-pink-400 mb-3">لقطات المشهد:</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {scene.shots.map((shot, shotIndex) => {
                                      const key = `${sceneIndex}-${shotIndex}`;
                                      const imageState = shotImageStates[key];
                                      const imageUrl = shotImages[key];
                                      return (
                                        <div key={key} className="bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700">
                                            <div className="w-full aspect-video bg-gray-700 flex items-center justify-center relative">
                                                {imageState?.state === 'loaded' && imageUrl ? (
                                                    <img src={imageUrl} alt={`لقطة ${shotIndex + 1} من ${scene.title}`} className="w-full h-full object-cover"/>
                                                ) : imageState?.state === 'loading' ? (
                                                    <div className="flex flex-col items-center text-gray-400 text-center">
                                                        <LoadingSpinner className="w-8 h-8"/>
                                                        <span className="text-xs mt-2">يتم رسم اللقطة...</span>
                                                    </div>
                                                ) : imageState?.state === 'error' ? (
                                                    <div className="flex flex-col items-center text-red-400 text-center p-2">
                                                        <ImageIcon className="w-8 h-8" />
                                                        <span className="text-xs mt-2 font-semibold">فشل تحميل الصورة</span>
                                                        <p className="text-xs mt-1 text-red-500 max-w-xs">{imageState.error}</p>
                                                        <button onClick={() => handleGenerateShotImage(shot, sceneIndex, shotIndex)} className="mt-2 flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-600 hover:bg-gray-500 rounded-md text-white"><RetryIcon className="w-2 h-2"/> إعادة</button>
                                                    </div>
                                                ) : (
                                                    <ImageIcon className="w-10 h-10 text-gray-500" />
                                                )}
                                            </div>
                                            <p className="p-3 text-xs text-gray-400 bg-gray-900">{shot.description}</p>
                                        </div>
                                      );
                                  })}
                              </div>
                          </div>
                        )}

                        {scene.characters.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-700">
                              <h4 className="font-bold text-lg text-pink-400 mb-3">الشخصيات في هذا المشهد:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {scene.characters.map((character, charIndex) => {
                                      const dataKey = character.name;
                                      const imageState = charImageStates[dataKey];
                                      const imageUrl = characterImages[dataKey];
                                      const isEditing = editingCharacterName === dataKey;
                                      
                                      return (
                                          <div key={`${sceneIndex}-${charIndex}`} className="bg-gray-900/60 rounded-lg p-4 border border-gray-700 flex flex-col sm:flex-row items-start gap-4">
                                              <div className="w-full sm:w-32 h-32 flex-shrink-0 bg-gray-700 rounded-md flex items-center justify-center overflow-hidden">
                                                  {imageState?.state === 'loading' && (
                                                      <div className="flex flex-col items-center text-gray-400 text-center">
                                                          <LoadingSpinner className="w-8 h-8"/>
                                                          <span className="text-xs mt-1">يتم الرسم...</span>
                                                      </div>
                                                  )}
                                                  {imageState?.state === 'error' && (
                                                      <div className="flex flex-col items-center text-red-400 text-center p-2">
                                                          <ImageIcon className="w-8 h-8" />
                                                          <span className="text-xs mt-1 font-semibold">فشل التحميل</span>
                                                          <p className="text-xs mt-1 text-red-500 max-w-xs">{imageState?.error}</p>
                                                            <button onClick={() => handleGenerateCharacterImage(character)} className="mt-1 flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-600 hover:bg-gray-500 rounded-md text-white"><RetryIcon className="w-2 h-2"/> إعادة</button>
                                                      </div>
                                                  )}
                                                  {imageState?.state === 'loaded' && imageUrl && (
                                                      <img src={imageUrl} alt={`صورة لـ ${character.name}`} className="w-full h-full object-cover"/>
                                                  )}
                                                  {!imageState && (
                                                      <ImageIcon className="w-10 h-10 text-gray-500" />
                                                  )}
                                              </div>
                                              <div className="flex-grow">
                                                  <h5 className="font-bold text-white">{character.name}</h5>
                                                  {isEditing ? (
                                                    <div className="mt-2">
                                                        <textarea
                                                            value={editText}
                                                            onChange={(e) => setEditText(e.target.value)}
                                                            className="w-full p-2 bg-gray-800 border-2 border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 resize-y text-sm text-white"
                                                            rows={3}
                                                        />
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <button onClick={() => handleUpdateCharacterDescription(dataKey, editText)} className="p-1.5 text-green-400 hover:bg-gray-700 rounded-full transition-colors"><CheckIcon className="w-5 h-5"/></button>
                                                            <button onClick={() => setEditingCharacterName(null)} className="p-1.5 text-red-400 hover:bg-gray-700 rounded-full transition-colors"><XIcon className="w-5 h-5"/></button>
                                                        </div>
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-start gap-2">
                                                        <p className="flex-grow text-sm text-gray-400 mt-1">{character.description}</p>
                                                        <button 
                                                            onClick={() => {
                                                                setEditingCharacterName(dataKey);
                                                                setEditText(character.description);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
                                                            aria-label="Edit description"
                                                        >
                                                            <PencilIcon className="w-4 h-4"/>
                                                        </button>
                                                    </div>
                                                  )}
                                              </div>
                                          </div>
                                      )
                                  })}
                              </div>
                          </div>
                        )}
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