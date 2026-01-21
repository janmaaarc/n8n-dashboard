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
    primary: 'px-8 py-4 text-base font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg',
    secondary: 'px-8 py-4 text-base font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg',
    ghost: 'px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300',
    cta: 'px-8 py-4 text-base font-medium text-neutral-900 bg-white rounded-lg',
  };

  const pressedScale = isPressed ? 'scale-[0.97]' : 'scale-100';
  const hoverClasses = variant === 'primary'
    ? 'hover:bg-neutral-800 dark:hover:bg-neutral-100'
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
              <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center">
                <Workflow size={18} className="text-white dark:text-neutral-900" />
              </div>
              <span className="font-semibold">n8n Pulse</span>
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

        <div className={`mx-auto max-w-5xl text-center relative transition-all duration-700 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-neutral-600 dark:text-neutral-300">Open source workflow monitoring</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight">
            Monitor your n8n workflows
            <br />
            from anywhere
          </h1>

          <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            A beautiful dashboard to track your workflow executions, catch errors instantly,
            and keep your automations running smoothly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
          <div className="flex items-center justify-center gap-8 sm:gap-16 mt-16 text-sm">
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
          <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
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
                    className={`p-3 sm:p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 transition-all duration-300 ${
                      previewSection.isInView ? 'opacity-100' : 'opacity-0'
                    }`}
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
                    className="flex-1 bg-neutral-300 dark:bg-neutral-600 rounded-t"
                    style={{
                      height: previewSection.isInView ? `${h}%` : '0%',
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
                className={`group p-6 sm:p-8 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-300 ${
                  featuresSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mb-5">
                  <feature.icon size={24} className="text-neutral-600 dark:text-neutral-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
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
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t border-dashed border-neutral-300 dark:border-neutral-600" />
                )}
                <div className="text-center relative">
                  <div className="w-14 h-14 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center mx-auto mb-5 text-white dark:text-neutral-900 text-xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
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
          <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-900 dark:bg-white">
            <div className="relative px-6 py-12 sm:px-16 sm:py-20 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white dark:text-neutral-900 mb-4">
                Ready to monitor your workflows?
              </h2>
              <p className="text-base sm:text-lg text-neutral-400 dark:text-neutral-600 mb-8 max-w-xl mx-auto">
                Join now and get full visibility into your n8n automations. Free forever for personal use.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <TouchButton onClick={openSignUp} variant="cta" className="w-full sm:w-auto group">
                  Get Started Free
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </TouchButton>
                <button
                  onClick={openSignIn}
                  className="w-full sm:w-auto px-8 py-4 text-base font-medium text-neutral-400 dark:text-neutral-600 border border-neutral-700 dark:border-neutral-300 hover:text-white dark:hover:text-neutral-900 hover:border-neutral-500 dark:hover:border-neutral-400 rounded-lg transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
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
