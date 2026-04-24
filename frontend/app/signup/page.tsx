'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Loader2, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { login, signup } from '@/lib/api';
import { mergeState } from '@/lib/storage';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  const handleSocialLogin = (provider: 'google' | 'github') => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/oauth/${provider}`;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signup({ full_name: fullName, email, password });
      const result = await login({ email, password });
      mergeState({ authToken: result.access_token, currentUser: result.user });
      router.push('/upload');
    } catch (err: any) {
      setError(err?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full grid grid-cols-2 bg-white rounded-[3rem] overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/50">
        
        {/* Left Side - Info */}
        <div className="bg-blue-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
           <div className="relative z-10 space-y-8">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center text-white font-black italic text-2xl shadow-xl">R</div>
              <div className="space-y-4">
                 <h2 className="text-4xl font-black leading-tight tracking-tight">Your Dream Job is a Resume Away.</h2>
                 <p className="text-blue-100 text-lg font-medium opacity-90">Join 10,000+ professionals using AI to double their interview rates.</p>
              </div>
              
              <div className="space-y-4 pt-6">
                 <FeatureCheck label="3 Free AI-Optimized Resumes" />
                 <FeatureCheck label="Access to ATS-Safe Templates" />
                 <FeatureCheck label="Live PDF Preview" />
                 <FeatureCheck label="Smart Keyword Suggestions" />
              </div>
           </div>

           <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-50"></div>
           <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-400 rounded-full blur-3xl opacity-30"></div>
        </div>

        {/* Right Side - Form */}
        <div className="p-12 flex flex-col justify-center space-y-6">
           <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Get Started</h1>
              <p className="text-slate-500 font-medium text-sm">Create your free account in seconds.</p>
           </div>

           <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-2 py-3 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-700 text-sm"
            >
              <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-5 h-5" alt="Google" />
              Google
            </button>
            <button 
              onClick={() => handleSocialLogin('github')}
              className="flex items-center justify-center gap-2 py-3 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-700 text-sm"
            >
              <img src="https://www.svgrepo.com/show/341847/github-icon.svg" className="w-5 h-5" alt="GitHub" />
              GitHub
            </button>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-slate-400 font-bold tracking-widest">Or sign up with email</span></div>
          </div>

           {error && (
             <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-medium">
               {error}
             </div>
           )}

           <form onSubmit={handleSignup} className="space-y-4">
             <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
               <div className="relative">
                 <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input
                   type="text"
                   required
                   value={fullName}
                   onChange={(e) => setFullName(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm"
                   placeholder="John Doe"
                 />
               </div>
             </div>

             <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
               <div className="relative">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input
                   type="email"
                   required
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm"
                   placeholder="name@example.com"
                 />
               </div>
             </div>

             <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
               <div className="relative">
                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input
                   type="password"
                   required
                   minLength={8}
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm"
                   placeholder="Min. 8 characters"
                 />
               </div>
             </div>

             <button
               type="submit"
               disabled={loading}
               className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group text-sm"
             >
               {loading ? <Loader2 className="animate-spin" /> : (
                 <>
                   Create Account
                   <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </>
               )}
             </button>
           </form>

           <div className="text-center">
             <p className="text-slate-500 text-xs font-medium">
               Already have an account?{' '}
               <Link href="/login" className="text-blue-600 font-bold hover:underline">Log in</Link>
             </p>
           </div>
        </div>

      </div>
    </div>
  );
}

function FeatureCheck({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
       <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
          <Check size={12} className="text-white" />
       </div>
       <span className="text-sm font-bold tracking-tight">{label}</span>
    </div>
  );
}
