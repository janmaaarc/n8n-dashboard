import React, { useState, useEffect, useRef } from 'react';
import {
  Workflow,
  Shield,
  Bell,
  BarChart3,
  Zap,
  Moon,
  Sun,
  CheckCircle,
  Play,
  ArrowRight,
  Github,
  ExternalLink,
} from 'lucide-react';
import { AuthModal } from './AuthModal';

interface LandingPageProps {
  darkMode: boolean;
  toggleTheme: () => void;
}

// Hook for detecting if element is in viewport
const useInView = (threshold = 0.1) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
};

// Touch-friendly button component
interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'cta';
  href?: string;
  external?: boolean;
}

const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  href,
  external,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const baseClasses = 'relative overflow-hidden select-none transition-all duration-150 flex items-center justify-center gap-2';

  const variantClasses = {
    primary: 'px-8 py-4 text-base font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25',
    secondary: 'px-8 py-4 text-base font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl',
    ghost: 'px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300',
    cta: 'px-8 py-4 text-base font-medium text-indigo-600 bg-white rounded-xl shadow-lg',
  };

  const pressedScale = isPressed ? 'scale-[0.97]' : 'scale-100';
  const hoverClasses = variant === 'primary'
    ? 'hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl hover:shadow-indigo-500/30'
    : variant === 'secondary'
    ? 'hover:border-neutral-300 dark:hover:border-neutral-600'
    : variant === 'cta'
    ? 'hover:bg-neutral-100'
    : 'hover:text-neutral-900 dark:hover:text-white';

  const handlePointerDown = () => setIsPressed(true);
  const handlePointerUp = () => setIsPressed(false);

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${pressedScale} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={combinedClasses}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className={combinedClasses}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
    >
      {children}
    </button>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ darkMode, toggleTheme }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [headerScrolled, setHeaderScrolled] = useState(false);

  // Scroll detection for header
  useEffect(() => {
    const handleScroll = () => {
      setHeaderScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // InView hooks for animations
  const heroSection = useInView(0.1);
  const previewSection = useInView(0.2);
  const featuresSection = useInView(0.1);
  const howItWorksSection = useInView(0.1);
  const ctaSection = useInView(0.2);

  const openSignIn = () => {
    setAuthMode('signin');
    setShowAuth(true);
  };

  const openSignUp = () => {
    setAuthMode('signup');
    setShowAuth(true);
  };

  const features = [
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track executions with live updates, 7-day history charts, and detailed success/error metrics.',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Get browser notifications when workflows fail or complete. Never miss an important execution.',
    },
    {
      icon: Shield,
      title: 'Encrypted Storage',
      description: 'Your n8n API keys are encrypted with AES-256 and stored securely. We never see your credentials.',
    },
    {
      icon: Zap,
      title: 'One-Click Actions',
      description: 'Trigger, activate, or pause workflows instantly. Manage everything from a single dashboard.',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 font-sans text-neutral-900 dark:text-neutral-100 overflow-x-hidden">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          headerScrolled
            ? 'border-b border-neutral-200/50 dark:border-neutral-700/50 bg-white/90 dark:bg-neutral-900/95 backdrop-blur-lg shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Workflow size={18} className="text-white" />
              </div>
              <span className="font-semibold">n8n Dashboard</span>
            </div>
            <div className="flex items-center gap-2 animate-fade-in">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-all active:scale-95"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <TouchButton onClick={openSignIn} variant="ghost" className="hidden sm:flex">
                Sign In
              </TouchButton>
              <TouchButton onClick={openSignUp} variant="primary" className="!px-4 !py-2 text-sm !rounded-lg">
                Get Started
              </TouchButton>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroSection.ref} className="pt-32 pb-20 px-4 sm:px-6 relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-transparent to-transparent dark:from-indigo-500/10 dark:via-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-400/20 to-purple-400/20 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />

        <div className={`mx-auto max-w-5xl text-center relative transition-all duration-700 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm mb-8 shadow-sm animate-slide-down" style={{ animationDelay: '0.1s' }}>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-neutral-600 dark:text-neutral-300">Open source workflow monitoring</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Monitor your{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              n8n workflows
            </span>
            <br />
            from anywhere
          </h1>

          <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-300 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.3s' }}>
            A beautiful dashboard to track your workflow executions, catch errors instantly,
            and keep your automations running smoothly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <TouchButton onClick={openSignUp} variant="primary" className="w-full sm:w-auto group">
              Start Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </TouchButton>
            <TouchButton
              href="https://github.com/janmaaarc/n8n-dashboard"
              external
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Github size={18} />
              View on GitHub
            </TouchButton>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 sm:gap-16 mt-16 text-sm animate-fade-in" style={{ animationDelay: '0.5s' }}>
            {[
              { value: '100%', label: 'Open Source' },
              { value: 'Free', label: 'Self-hosted' },
              { value: 'Secure', label: 'Encrypted' },
            ].map((stat, i) => (
              <React.Fragment key={stat.label}>
                {i > 0 && <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />}
                <div className="group cursor-default">
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white group-hover:scale-110 transition-transform">
                    {stat.value}
                  </div>
                  <div className="text-neutral-500 dark:text-neutral-300">{stat.label}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section ref={previewSection.ref} className="py-8 px-4 sm:px-6">
        <div className={`mx-auto max-w-5xl transition-all duration-700 delay-100 ${previewSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-2xl shadow-neutral-900/10 dark:shadow-indigo-500/5 bg-white dark:bg-neutral-800 hover:shadow-3xl transition-shadow duration-500">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-pointer" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-neutral-100 dark:bg-neutral-700 text-xs text-neutral-500 dark:text-neutral-300 font-mono">
                  dashboard.example.com
                </div>
              </div>
            </div>
            {/* Dashboard Mockup */}
            <div className="p-4 sm:p-6 bg-neutral-50 dark:bg-neutral-900">
              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {[
                  { label: 'Workflows', value: '24', icon: Workflow },
                  { label: 'Executions', value: '1,847', icon: Play },
                  { label: 'Success Rate', value: '98.5%', icon: CheckCircle },
                  { label: 'Active', value: '18', icon: Zap },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className={`p-3 sm:p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-300 cursor-pointer active:scale-[0.98] ${
                      previewSection.isInView ? 'animate-slide-up opacity-100' : 'opacity-0'
                    }`}
                    style={{ animationDelay: `${0.1 + i * 0.05}s` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</span>
                      <stat.icon size={14} className="text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <div className="text-lg sm:text-xl font-semibold">{stat.value}</div>
                  </div>
                ))}
              </div>
              {/* Chart Placeholder */}
              <div className="h-24 sm:h-32 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-end gap-1 p-3 sm:p-4 overflow-hidden">
                {[40, 65, 45, 80, 55, 70, 90, 75, 85, 60, 95, 70].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t opacity-80 hover:opacity-100 transition-all duration-300 cursor-pointer ${
                      previewSection.isInView ? 'animate-grow-up' : ''
                    }`}
                    style={{
                      height: previewSection.isInView ? `${h}%` : '0%',
                      transitionDelay: `${0.3 + i * 0.05}s`,
                      transition: 'height 0.5s ease-out'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresSection.ref} className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className={`text-center mb-16 transition-all duration-700 ${featuresSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
              A complete monitoring solution for your n8n automations
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group p-6 sm:p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer active:scale-[0.98] ${
                  featuresSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-5 group-hover:scale-110 group-active:scale-100 transition-transform shadow-lg shadow-indigo-500/20">
                  <feature.icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section ref={howItWorksSection.ref} className="py-24 px-4 sm:px-6 bg-neutral-100/50 dark:bg-neutral-800/50">
        <div className="mx-auto max-w-4xl">
          <div className={`text-center mb-16 transition-all duration-700 ${howItWorksSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Get started in minutes</h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-300">
              Three simple steps to monitor your workflows
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Create account',
                description: 'Sign up with your email — no credit card required.',
              },
              {
                step: '2',
                title: 'Connect n8n',
                description: 'Add your n8n instance URL and API key securely.',
              },
              {
                step: '3',
                title: 'Start monitoring',
                description: 'See your workflows and executions in real-time.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`relative transition-all duration-700 ${
                  howItWorksSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${i * 0.15}s` }}
              >
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-neutral-300 dark:border-neutral-600" />
                )}
                <div className="text-center relative group cursor-pointer">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-5 text-white text-2xl font-bold shadow-lg shadow-indigo-500/30 group-hover:scale-110 group-active:scale-100 transition-transform">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-300">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaSection.ref} className="py-24 px-4 sm:px-6">
        <div className={`mx-auto max-w-4xl transition-all duration-700 ${ctaSection.isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtMnYtMmgydi0yaC0ydi0yaDJ2LTJoLTJ2LTJoMnYtMmgtMlY4aDJ2MmgtMnYyaDJ2MmgtMnYyaDJ2MmgtMnYyaDJ2MmgtMnYyaDJ2MmgtMnYyaDJ2MmgtMnYyaDJ2NGgtMnYyaDJ2Mmgtdjh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

            <div className="relative px-6 py-12 sm:px-16 sm:py-20 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to monitor your workflows?
              </h2>
              <p className="text-base sm:text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Join now and get full visibility into your n8n automations. Free forever for personal use.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <TouchButton onClick={openSignUp} variant="cta" className="w-full sm:w-auto group">
                  Get Started Free
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </TouchButton>
                <button
                  onClick={openSignIn}
                  className="w-full sm:w-auto px-8 py-4 text-base font-medium text-white border-2 border-white/30 hover:border-white/50 hover:bg-white/10 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
                >
                  Sign In
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-neutral-200 dark:border-neutral-700">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-6 text-sm text-neutral-500 dark:text-neutral-400">
              <a
                href="https://github.com/janmaaarc/n8n-dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 active:scale-95"
              >
                <Github size={16} />
                GitHub
              </a>
              <span className="text-neutral-400 dark:text-neutral-500">·</span>
              <span>Open source monitoring for n8n</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        initialMode={authMode}
      />
    </div>
  );
};
