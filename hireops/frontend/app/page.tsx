import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center gap-6">
      <h1 className="text-4xl md:text-6xl font-black tracking-tight text-primary">
        Welcome to HireOps
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl">
        The Agentic AI Platform for seamless remote hiring, proctoring, and evaluation.
      </p>

      <div className="flex items-center justify-center gap-4 mt-8">
        <Link href="/login" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all">
          Get Started
        </Link>
        <Link href="/candidate/assessment/demo" className="px-6 py-3 rounded-lg border border-input bg-background font-semibold hover:bg-accent transition-all">
          View Demo Assessment
        </Link>
      </div>
    </div>
  );
}
