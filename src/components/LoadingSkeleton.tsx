import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingSkeleton() {
  return (
    <div className="relative min-h-[100dvh]">
      <div className="pointer-events-none absolute inset-0 bg-animated-purple opacity-75" />
      
      <div className="relative flex flex-col min-h-[100dvh]">
        {/* Header skeleton */}
        <motion.header 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="header-gradient border-b border-border p-4 backdrop-blur-sm bg-background/80"
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col gap-4 md:gap-6">
              {/* Title skeleton */}
              <div className="text-center space-y-2">
                <div className="h-8 bg-purple-300/20 rounded-lg w-48 mx-auto animate-pulse" />
                <div className="h-4 bg-purple-300/10 rounded-lg w-64 mx-auto animate-pulse" />
              </div>
              
              {/* Stats skeleton */}
              <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 text-sm">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-300/20 rounded animate-pulse" />
                    <div className="h-4 bg-purple-300/20 rounded w-16 animate-pulse" />
                  </div>
                ))}
              </div>
              
              {/* Buttons skeleton */}
              <div className="flex gap-2">
                <div className="flex-1 h-12 bg-purple-300/20 rounded-lg animate-pulse" />
                <div className="h-12 w-12 bg-purple-300/20 rounded-lg animate-pulse" />
                <div className="h-12 w-12 bg-purple-300/20 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main content skeleton */}
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {/* Large content area skeleton */}
              <div className="min-h-[400px] bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm p-6">
                <div className="space-y-4">
                  {/* Microphone button area */}
                  <div className="flex justify-center">
                    <div className="w-24 h-24 bg-purple-300/20 rounded-full animate-pulse" />
                  </div>
                  
                  {/* Text lines skeleton */}
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-purple-300/10 rounded w-full animate-pulse" />
                        <div className="h-4 bg-purple-300/10 rounded w-5/6 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Action buttons skeleton */}
              <div className="flex gap-2 justify-center">
                <div className="h-10 w-32 bg-purple-300/20 rounded-lg animate-pulse" />
                <div className="h-10 w-32 bg-purple-300/20 rounded-lg animate-pulse" />
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}