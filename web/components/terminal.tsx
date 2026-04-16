'use client';

import { useState, useEffect, useRef } from 'react';

const COMMANDS = [
  { text: 'pulse init', delay: 1000 },
  { text: 'Analyzing codebase structure...', type: 'info', delay: 1500 },
  { text: 'Detecting security vulnerabilities...', type: 'info', delay: 1200 },
  { text: 'Found 0 vulnerabilities. Quality gate PASSED.', type: 'success', delay: 1000 },
  { text: 'pulse commit -m "add auth layer"', delay: 800 },
  { text: 'Generated conventional commit:', type: 'info', delay: 500 },
  { text: 'feat(auth): implement jwt token rotation and secure session handling', type: 'success', delay: 2000 },
];

export default function Terminal() {
  const [lines, setLines] = useState<{ text: string; type?: string }[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const runCommand = async () => {
      if (commandIndex >= COMMANDS.length) {
        timeout = setTimeout(() => {
          setLines([]);
          setCommandIndex(0);
        }, 3000);
        return;
      }

      const cmd = COMMANDS[commandIndex];
      
      if (!cmd.type) {
        // Typing effect for commands
        for (let i = 0; i <= cmd.text.length; i++) {
          setCurrentText(cmd.text.slice(0, i));
          await new Promise(r => setTimeout(r, 50));
        }
        await new Promise(r => setTimeout(r, 500));
        setLines(prev => [...prev, { text: cmd.text }]);
        setCurrentText('');
      } else {
        // Instant for info/success
        setLines(prev => [...prev, cmd]);
      }

      setCommandIndex(prev => prev + 1);
    };

    timeout = setTimeout(runCommand, COMMANDS[commandIndex]?.delay || 1000);
    return () => clearTimeout(timeout);
  }, [commandIndex, lines]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, currentText]);

  return (
    <div className="w-full max-w-2xl mx-auto grainy">
      <div className="glass-panel rounded-xl overflow-hidden shadow-2xl pulse-glow border-stone-800/50">
        <div className="bg-stone-900/50 px-4 py-3 flex items-center justify-between border-b border-stone-800">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-900/50" />
            <div className="w-3 h-3 rounded-full bg-amber-900/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-900/50" />
          </div>
          <div className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">gitpulse — live_preview</div>
          <div className="w-10" />
        </div>
        
        <div 
          ref={containerRef}
          className="p-6 h-[320px] font-mono text-sm overflow-y-auto bg-black/40"
        >
          {lines.map((line, i) => (
            <div key={i} className="mb-2 leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
              {line.type === 'success' ? (
                <span className="text-emerald-400">
                  <span className="text-stone-600 mr-2">✦</span>
                  {line.text}
                </span>
              ) : line.type === 'info' ? (
                <span className="text-stone-400">{line.text}</span>
              ) : (
                <div className="flex">
                  <span className="text-emerald-500 mr-2">$</span>
                  <span className="text-stone-100">{line.text}</span>
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center">
            <span className="text-emerald-500 mr-2">$</span>
            <span className="text-stone-100">{currentText}</span>
            <span className="w-2 h-4 bg-emerald-500 ml-1 animate-pulse" />
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-stone-900/30 px-6 py-2 border-t border-stone-800 flex justify-between items-center text-[10px] font-mono">
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Pulse Active
            </span>
            <span className="text-stone-600">•</span>
            <span className="text-stone-500">v3.1.0-obsidian</span>
          </div>
          <div className="text-stone-600">
            UTF-8
          </div>
        </div>
      </div>
      
      {/* Decorative Glows */}
      <div className="absolute -z-10 -top-12 -left-12 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full" />
      <div className="absolute -z-10 -bottom-12 -right-12 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full" />
    </div>
  );
}
