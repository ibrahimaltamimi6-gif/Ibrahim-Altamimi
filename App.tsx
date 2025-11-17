import React, { useState, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { generateStory } from './services/geminiService';
import Header from './components/Header';
import PromptForm from './components/PromptForm';
import StoryDisplay from './components/StoryDisplay';
import Footer from './components/Footer';

// AppContent handles state and routing logic
function AppContent() {
  const [prompt, setPrompt] = useState<string>('');
  const [story, setStory] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<string>('مغامرة'); // Default tone
  const [numScenes, setNumScenes] = useState<number>(3); // Default number of scenes
  const navigate = useNavigate();

  const handleApiKeySelect = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
    } catch (e) {
      console.error("Failed to open API key selection:", e);
      setError("فشل فتح نافذة اختيار المفتاح.");
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setStory('');
    navigate('/story'); // Navigate immediately to show loading spinner on the story page

    try {
      // Ensure API key is selected before generating content
      const hasApiKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasApiKey) {
        await handleApiKeySelect();
      }

      const result = await generateStory(prompt, tone, numScenes);
      setStory(result);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      // If the error indicates an invalid key, prompt the user to select a new one.
      if (err.message && err.message.includes("صالح")) {
          handleApiKeySelect();
      }
    } finally {
      setIsLoading(false);
    }
  }, [prompt, isLoading, tone, numScenes, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 font-sans">
      <Header onApiKeyClick={handleApiKeySelect} />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
        <Routes>
          <Route
            path="/"
            element={
              <div className="w-full max-w-4xl">
                <PromptForm
                  prompt={prompt}
                  setPrompt={setPrompt}
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  tone={tone}
                  setTone={setTone}
                  numScenes={numScenes}
                  setNumScenes={setNumScenes}
                />
              </div>
            }
          />
          <Route
            path="/story"
            element={
              <div className="w-full max-w-4xl">
                <StoryDisplay
                  story={story}
                  isLoading={isLoading}
                  error={error}
                  onSelectApiKey={handleApiKeySelect}
                />
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

// App is the root component that sets up the router
function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;
