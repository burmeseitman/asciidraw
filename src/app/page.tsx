"use client";

import { useState, useRef, useEffect } from 'react';
import { Upload, Terminal, Image as ImageIcon, Zap, Shield, Sparkles, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ascii, setAscii] = useState<[string, number, number, number][][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError("File too large. Max size is 5MB.");
        return;
      }
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      processImage(selected);
    }
  };

  const processImage = async (imgFile: File) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', imgFile);
    formData.append('width', '300'); // Increased width for much higher detail

    try {
      const resp = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });
      const data = await resp.json();
      if (data.error) {
        setError(data.error);
      } else if (data.ascii) {
        const rows = data.ascii.trim().split('\n').map((row: string) => 
          row.split('|').filter(Boolean).map((cell: string) => JSON.parse(cell))
        );
        setAscii(rows);
      }
    } catch (err) {
      setError("Failed to process image. Make sure the server is healthy.");
    } finally {
      setLoading(false);
    }
  };

  const copyTerminalCommand = () => {
    const cmd = `curl -sSL ${window.location.origin}/api/convert | bash`;
    navigator.clipboard.writeText(cmd);
    alert("Copied to clipboard!");
  };

  return (
    <main className="min-h-screen p-4 md:p-8 flex flex-col gap-8 max-w-[1600px] mx-auto overflow-hidden">
      {/* Header & Controls Row */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between shrink-0">
        <header className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-2 glass rounded-xl shrink-0"
              >
                <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500/20" />
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tighter glow-text flex-nowrap">ASCII DRAW</h1>
            </div>
            <ThemeToggle />
            <a 
              href="https://github.com/burmeseitman/asciidraw" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 glass rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              title="View on GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm max-w-xs">
            Premium ASCII Masterpieces.
          </p>
        </header>

        <section className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <button 
            className="group relative px-8 py-4 bg-cyan-600 dark:bg-cyan-500 rounded-2xl flex items-center justify-center gap-4 cursor-pointer hover:bg-cyan-700 dark:hover:bg-cyan-600 transition-all active:scale-95 shadow-lg shadow-cyan-500/20 shrink-0 min-w-[220px] overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
            <Upload className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="text-sm font-bold text-white uppercase tracking-tight">Upload Image</p>
              <p className="text-[10px] text-cyan-100/60 font-medium">PNG, JPG, WEBP, GIF</p>
            </div>
          </button>

          <div className="glass px-6 py-4 flex flex-col gap-2 flex-1 sm:flex-none min-w-[280px]">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xs font-bold flex items-center gap-2 whitespace-nowrap">
                <Terminal className="w-3 h-3 text-emerald-600 dark:text-emerald-500" /> CLI Access
              </h3>
              <button 
                onClick={copyTerminalCommand}
                className="text-[10px] px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded hover:bg-black/10 dark:hover:bg-white/20 transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
            <code className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-black/5 dark:bg-black/40 p-2 rounded block overflow-hidden text-ellipsis whitespace-nowrap font-mono">
              curl -sSL ... | bash
            </code>
          </div>
        </section>
      </div>

      {/* Full-Width Masterpiece Section */}
      <section className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="font-bold flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-500" /> ASCII Masterpiece
          </h3>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-zinc-800 dark:border-white"></div>
              <span>Processing...</span>
            </div>
          )}
        </div>

        <div className="flex-1 glass bg-white/40 dark:bg-black/60 rounded-2xl p-4 md:p-6 overflow-auto border-black/5 dark:border-white/10 flex items-start justify-center relative">
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-red-500 dark:text-red-400 p-8 text-center"
              >
                <Shield className="w-16 h-16 opacity-20" />
                <p className="text-lg font-medium">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="px-6 py-2 glass hover:bg-black/5 dark:hover:bg-white/10 transition-all text-sm font-semibold"
                >
                  Try Again
                </button>
              </motion.div>
            ) : ascii.length > 0 ? (
              <motion.div 
                key="ascii"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="ascii-container text-[1px] leading-[1px] sm:text-[2px] sm:leading-[2px] md:text-[3px] md:leading-[3px] lg:text-[4px] lg:leading-[4px] xl:text-[5px] xl:leading-[5px] mx-auto inline-block min-w-max"
              >
                {ascii.map((row, y) => (
                  <div key={y} className="flex whitespace-nowrap">
                    {row.map((cell, x) => (
                      <span key={x} style={{ color: `rgb(${cell[1]}, ${cell[2]}, ${cell[3]})` }}>
                        {cell[0]}
                      </span>
                    ))}
                  </div>
                ))}
              </motion.div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-zinc-400 dark:text-zinc-600 opacity-40">
                <div className="relative">
                  <ImageIcon className="w-20 h-20" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-dashed border-current rounded-full scale-150 opacity-20"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xl font-medium tracking-wide">NO VISION DETECTED</p>
                  <p className="text-[10px] uppercase tracking-widest mt-2">Upload an image to start</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <footer className="py-4 text-center text-zinc-400 dark:text-zinc-600 text-[10px] border-t border-black/5 dark:border-white/5 shrink-0">
        <p>© 2026 ASCII DRAW. Visual Excellence at Scale.</p>
      </footer>
    </main>
  );
}
