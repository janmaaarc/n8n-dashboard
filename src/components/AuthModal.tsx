import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Loader2, AlertCircle, Workflow, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'signin' | 'signup' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Reset mode when modal opens with a new initialMode
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { signIn, signUp, resetPassword } = useAuth();

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          onClose();
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email to confirm your account.');
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for password reset instructions.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signin':
        return 'Welcome back';
      case 'signup':
        return 'Create your account';
      case 'reset':
        return 'Reset password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signin':
        return 'Sign in to access your dashboard';
      case 'signup':
        return 'Start monitoring your n8n workflows';
      case 'reset':
        return "We'll send you a reset link";
    }
  };

  const getButtonText = () => {
    if (loading) return 'Please wait...';
    switch (mode) {
      case 'signin':
        return 'Sign In';
      case 'signup':
        return 'Create Account';
      case 'reset':
        return 'Send Reset Link';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-[12vh] px-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-zoom-in">
        {/* Header with gradient */}
        <div className="relative px-6 pt-6 pb-4">
          {/* Background gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Logo and title */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
              <Workflow size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{getTitle()}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{getSubtitle()}</p>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {message && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <CheckCircle size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Password (not shown for reset mode) */}
          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                  Must be at least 6 characters
                </p>
              )}
            </div>
          )}

          {/* Forgot password link for signin mode */}
          {mode === 'signin' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setError(null);
                  setMessage(null);
                }}
                className="text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-indigo-500/25 group active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {getButtonText()}
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
            </div>
          </div>

          {/* Mode Switchers */}
          <div className="text-center text-sm">
            {mode === 'signin' && (
              <p className="text-neutral-500 dark:text-neutral-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setMessage(null);
                  }}
                  className="font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Sign up
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p className="text-neutral-500 dark:text-neutral-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setMessage(null);
                  }}
                  className="font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setMessage(null);
                }}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              >
                ← Back to sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
