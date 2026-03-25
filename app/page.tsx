"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type ProcessingState = "idle" | "uploading" | "processing" | "done" | "error";

// ─── Comparison Slider ───────────────────────────────
function ComparisonSlider({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const onMouseDown = () => { dragging.current = true; };
  const onMouseUp = () => { dragging.current = false; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (dragging.current) updatePos(e.clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    updatePos(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square overflow-hidden rounded-xl cursor-ew-resize select-none"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onMouseUp}
    >
      {/* Checkerboard background */}
      <div className="absolute inset-0 checkerboard" />

      {/* After (full) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="Result" className="absolute inset-0 w-full h-full object-contain" />

      {/* Before (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        {/* Checkerboard for this side */}
        <div className="absolute inset-0 checkerboard" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before}
          alt="Original"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ width: `${100 / (sliderPos / 100)}%`, maxWidth: "none" }}
          draggable={false}
        />
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 slider-handle z-10"
        style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
      />

      {/* Labels */}
      <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
        Before
      </div>
      <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
        After
      </div>
    </div>
  );
}

// ─── FAQ Item ───────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button
        className="w-full text-left py-4 flex justify-between items-center font-medium text-slate-900 hover:text-blue-600 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {q}
        <span className="ml-4 text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="pb-4 text-slate-600 text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────
export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  const processImage = async (file: File) => {
    setState("uploading");
    setError(null);
    setFileName(file.name);

    const previewUrl = URL.createObjectURL(file);
    setOriginalImage(previewUrl);

    const formData = new FormData();
    formData.append("image", file);

    try {
      setState("processing");
      const response = await fetch("/api/remove-bg", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process image");
      }

      const blob = await response.blob();
      const resultUrl = URL.createObjectURL(blob);
      setResultImage(resultUrl);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }
    processImage(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const reset = () => {
    setOriginalImage(null);
    setResultImage(null);
    setState("idle");
    setError(null);
    setFileName("");
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="py-5 px-4 border-b bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            🖼️ <span>BG Remover</span>
          </h1>
          <a
            href="https://github.com/robinzhou-ai/image-background-remover"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            GitHub
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* ── Idle: Hero + Upload ── */}
        {state === "idle" && (
          <>
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-3">
                Remove Image Background
              </h2>
              <p className="text-lg text-slate-600">
                Upload an image — AI removes the background in seconds
              </p>
            </div>

            {/* Upload Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`
                border-2 border-dashed rounded-2xl p-16 transition-all cursor-pointer text-center
                ${dragOver
                  ? "border-blue-500 bg-blue-50 scale-[1.01]"
                  : "border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50"
                }
              `}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <input
                type="file"
                id="fileInput"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <div className="text-6xl mb-4">📤</div>
              <p className="text-xl font-medium text-slate-700 mb-2">
                Drop your image here, or click to upload
              </p>
              <p className="text-sm text-slate-500">
                JPG, PNG, WebP · Max 10MB
              </p>
            </div>

            {error && (
              <p className="mt-4 text-center text-red-500 text-sm">{error}</p>
            )}
          </>
        )}

        {/* ── Uploading / Processing ── */}
        {(state === "uploading" || state === "processing") && (
          <div className="text-center py-20">
            <div className="text-6xl mb-6 animate-bounce">⚙️</div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              {state === "uploading" ? "Uploading image..." : "AI is removing the background..."}
            </h2>
            <p className="text-slate-500">Usually takes 5–10 seconds</p>
          </div>
        )}

        {/* ── Error ── */}
        {state === "error" && (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-2xl font-semibold text-red-600 mb-2">
              Processing failed
            </h2>
            <p className="text-slate-600 mb-2">{error}</p>
            <p className="text-sm text-slate-400 mb-6">
              Make sure your REMOVE_BG_API_KEY is set in environment variables.
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Done: Result ── */}
        {state === "done" && resultImage && originalImage && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-2xl font-bold text-slate-900">Background Removed!</h2>
              <p className="text-slate-500 text-sm mt-1">{fileName}</p>
            </div>

            {/* Comparison Slider */}
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <ComparisonSlider before={originalImage} after={resultImage} />
              <p className="text-center text-xs text-slate-400 mt-2">
                Drag the slider to compare before / after
              </p>
            </div>

            {/* Download */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={resultImage}
                download="removed-background.png"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                📥 Download PNG
              </a>
              <button
                onClick={reset}
                className="px-8 py-4 bg-slate-200 text-slate-700 rounded-xl font-semibold text-lg hover:bg-slate-300 transition-colors"
              >
                Process Another Image
              </button>
            </div>
          </div>
        )}

        {/* ── Features (shown on idle) ── */}
        {state === "idle" && (
          <div className="grid md:grid-cols-3 gap-5 mt-14">
            {[
              { icon: "🚀", title: "Fast", desc: "5–10 seconds per image with advanced AI" },
              { icon: "🔒", title: "Privacy First", desc: "Images processed in memory, never stored" },
              { icon: "💎", title: "High Quality", desc: "Precise edge detection and clean cutouts" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
                <p className="text-slate-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── How it Works (shown on idle) ── */}
        {state === "idle" && (
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">
              How it Works
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: "1", icon: "📤", title: "Upload Image", desc: "Drag & drop or click to select your photo" },
                { step: "2", icon: "⚙️", title: "AI Processing", desc: "Our AI analyzes and removes the background automatically" },
                { step: "3", icon: "📥", title: "Download Result", desc: "Get your transparent PNG and use it anywhere" },
              ].map(({ step, icon, title, desc }) => (
                <div key={step} className="text-center">
                  <div className="relative inline-flex items-center justify-center w-14 h-14 bg-blue-100 text-blue-600 font-bold rounded-full text-lg mb-4">
                    {step}
                  </div>
                  <div className="text-3xl mb-2">{icon}</div>
                  <h4 className="font-semibold text-slate-900 mb-1">{title}</h4>
                  <p className="text-slate-600 text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FAQ (shown on idle) ── */}
        {state === "idle" && (
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">
              FAQ
            </h3>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-6 mt-6">
              {[
                {
                  q: "Is it really free?",
                  a: "Yes! We offer 50 free background removals per month via the Remove.bg API. After that, you can upgrade your Remove.bg plan."
                },
                {
                  q: "What image formats are supported?",
                  a: "We support JPG, PNG, and WebP. Maximum file size is 10MB per image."
                },
                {
                  q: "Are my images stored?",
                  a: "No. Images are processed entirely in memory and are never written to disk or stored on any server."
                },
                {
                  q: "How does the AI work?",
                  a: "We use the Remove.bg API which is powered by advanced AI models trained on millions of images for accurate background removal."
                },
                {
                  q: "Can I use this commercially?",
                  a: "Yes, the images you process are yours to use commercially. We claim no rights over your content."
                },
              ].map(({ q, a }) => (
                <FAQItem key={q} q={q} a={a} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="py-6 text-center text-sm text-slate-400 border-t mt-8">
        Powered by Remove.bg API · Built with Next.js + Tailwind CSS
      </footer>
    </main>
  );
}
