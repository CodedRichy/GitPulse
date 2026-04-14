import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center selection:bg-stone-200 dark:selection:bg-stone-700">
      {/* Navigation */}
      <nav className="w-full flex items-center justify-between px-6 py-8 max-w-6xl">
        <div className="text-xl tracking-tight font-serif font-medium text-foreground">
          Git<span className="text-stone-400 dark:text-stone-500 italic">Pulse</span>
        </div>
        <div className="flex items-center gap-8 text-sm">
          <Link 
            href="/docs" 
            className="text-stone-500 dark:text-stone-400 hover:text-foreground transition-colors mix-blend-multiply dark:mix-blend-normal"
          >
            Documentation
          </Link>
          <Link 
            href="/login" 
            className="text-stone-500 dark:text-stone-400 hover:text-foreground transition-colors mix-blend-multiply dark:mix-blend-normal"
          >
            Sign in
          </Link>
          <Link 
            href="/register" 
            className="px-5 py-2.5 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity font-medium tracking-wide shadow-sm"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col flex-1 w-full items-center justify-center px-6 pt-24 pb-16 max-w-4xl text-center">
        <h1 className="font-serif text-6xl md:text-7xl font-normal text-foreground leading-[1.1] mb-8 tracking-tight">
          Intelligent control <br />
          <span className="text-stone-400 dark:text-stone-500 italic">for your code workflow.</span>
        </h1>
        <p className="text-lg md:text-xl text-stone-500 dark:text-stone-400 max-w-2xl font-light leading-relaxed mb-12">
          GitPulse sits elegantly within your terminal, organizing commits, maintaining documentation, and explaining deep histories with state-of-the-art AI.
        </p>
        <div className="flex items-center gap-4">
          <Link 
            href="/register" 
            className="px-6 py-3 rounded-full bg-foreground text-background hover:scale-105 transition-transform duration-300 font-medium tracking-wide shadow-md"
          >
            Start building for free
          </Link>
          <Link 
            href="/docs" 
            className="px-6 py-3 rounded-full border border-stone-200 dark:border-stone-800 text-foreground hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors font-medium tracking-wide"
          >
            Read the docs
          </Link>
        </div>
      </main>

      {/* Features Grid */}
      <section className="w-full max-w-6xl px-6 py-24 mb-12 border-t border-stone-200/50 dark:border-stone-800/50">
        <div className="grid md:grid-cols-3 gap-12 md:gap-8">
          <div className="flex flex-col group">
            <h3 className="font-serif text-2xl text-foreground mb-3 font-medium">Smart Commits</h3>
            <div className="h-px w-full bg-stone-200 dark:bg-stone-800 mb-6 group-hover:bg-stone-400 dark:group-hover:bg-stone-600 transition-colors duration-500"></div>
            <p className="text-stone-500 dark:text-stone-400 leading-relaxed font-light text-[15px]">
              Instantly generate meaningful commit messages that accurately describe your diffs, maintaining a pristine and readable repository history.
            </p>
          </div>
          <div className="flex flex-col group">
            <h3 className="font-serif text-2xl text-foreground mb-3 font-medium">Living Docs</h3>
            <div className="h-px w-full bg-stone-200 dark:bg-stone-800 mb-6 group-hover:bg-stone-400 dark:group-hover:bg-stone-600 transition-colors duration-500"></div>
            <p className="text-stone-500 dark:text-stone-400 leading-relaxed font-light text-[15px]">
              Automatically generate and maintain inline architecture documentation as your code changes. Stay synced without the manual overhead.
            </p>
          </div>
          <div className="flex flex-col group">
            <h3 className="font-serif text-2xl text-foreground mb-3 font-medium">Deep Analysis</h3>
            <div className="h-px w-full bg-stone-200 dark:bg-stone-800 mb-6 group-hover:bg-stone-400 dark:group-hover:bg-stone-600 transition-colors duration-500"></div>
            <p className="text-stone-500 dark:text-stone-400 leading-relaxed font-light text-[15px]">
              Understand complex pull requests and file modifications in plain English. Analyze test coverage and component dependencies natively.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-6xl px-6 py-12 flex flex-col md:flex-row items-center justify-between border-t border-stone-200/50 dark:border-stone-800/50 text-sm">
        <p className="text-stone-400 dark:text-stone-500 font-serif italic mb-4 md:mb-0">
          GitPulse
        </p>
        <div className="flex gap-8 text-stone-500 dark:text-stone-400">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <a href="https://github.com/GitPulse" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
