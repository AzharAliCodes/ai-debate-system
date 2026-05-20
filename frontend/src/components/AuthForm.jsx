import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';
import { setAuthToken, setUser } from '@/utils/auth';
import { useNavigate } from 'react-router-dom';

const AuthForm = ({ type }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const isSignUp = type === 'sign-up';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await api.post('/auth/signup', formData);
        navigate('/signin');
      } else {
        const res = await api.post('/auth/signin', { email: formData.email, password: formData.password });
        if (res.data.success) {
          setAuthToken(res.data.token);
          setUser(res.data.user);
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="w-full max-w-md mx-auto px-4">
      {/* Glassmorphism card */}
      <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl shadow-indigo-950/50 p-8 space-y-6">

        {/* Logo + Heading */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40 mb-1">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-indigo-400 uppercase mb-1">DebateIQ</p>
            <h1 className="text-2xl font-bold text-white">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isSignUp
                ? 'Sign up to start hosting AI-judged debates'
                : 'Sign in to continue to DebateIQ'}
            </p>
          </div>
        </div>

        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-300 text-sm font-medium">Full Name</Label>
              <Input
                id="name" name="name" type="text" placeholder="John Doe"
                value={formData.name} onChange={handleChange} required
                className="bg-slate-900/60 border-slate-600/80 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl h-11 transition-all"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-300 text-sm font-medium">Email</Label>
            <Input
              id="email" name="email" type="email" placeholder="john@example.com"
              value={formData.email} onChange={handleChange} required
              className="bg-slate-900/60 border-slate-600/80 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl h-11 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-300 text-sm font-medium">Password</Label>
            <Input
              id="password" name="password" type="password" placeholder="••••••••"
              value={formData.password} onChange={handleChange} required
              className="bg-slate-900/60 border-slate-600/80 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl h-11 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-200 mt-2"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </span>
            ) : isSignUp ? '🚀 Create Account' : '→ Sign In'}
          </Button>
        </form>

        {/* Footer link */}
        <p className="text-center text-sm text-slate-500">
          {isSignUp ? (
            <>Already have an account?{' '}
              <a href="/signin" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Sign In</a>
            </>
          ) : (
            <>Don't have an account?{' '}
              <a href="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Sign Up</a>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
