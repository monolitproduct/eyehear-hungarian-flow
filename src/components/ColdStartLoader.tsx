import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ColdStartLoaderProps {
  children: React.ReactNode;
  minDuration?: number; // Minimum time to show loader (ms)
}

export default function ColdStartLoader({ children, minDuration = 800 }: ColdStartLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Set minimum time elapsed
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDuration);

    // Set up listener for when React is fully hydrated
    const readyTimer = setTimeout(() => {
      if (minTimeElapsed) {
        setIsLoading(false);
      }
    }, 100);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(readyTimer);
    };
  }, [minDuration, minTimeElapsed]);

  // Also hide loader when both conditions are met
  useEffect(() => {
    if (minTimeElapsed && !isLoading) {
      setIsLoading(false);
    }
  }, [minTimeElapsed, isLoading]);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-white dark:bg-black flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            <div className="text-center">
              {/* Loading spinner */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto mb-6"
              />
              
              {/* App name */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white mb-2"
              >
                EyeHear
              </motion.h1>
              
              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 text-sm"
              >
                Magyar nyelvű beszédfelismerő AI
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence mode="wait">
        {!isLoading && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}