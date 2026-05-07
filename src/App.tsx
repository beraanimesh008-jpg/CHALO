/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { LogIn, ShieldCheck, MapPin, Bike } from 'lucide-react';
import { auth } from './lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import Layout from './Layout';
import { motion } from 'motion/react';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

// Pages
import Home from './pages/Home';
import DriverDashboard from './pages/DriverDashboard';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import RideDetails from './pages/RideDetails';
import Onboarding from './pages/Onboarding';
import DriverOnboarding from './pages/DriverOnboarding';


function Login() {
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Redirect if already logged in
  if (user && !authLoading) {
    if (profile && !profile.onboardingComplete) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked by browser. Please allow popups for this site.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Do nothing, user closed popup
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
      >
        {/* Abstract Background Element */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-50 rounded-full blur-3xl opacity-60"></div>
        
        <div className="relative text-center">
          <div className="inline-flex p-5 bg-brand-600 rounded-[2rem] shadow-xl shadow-brand-600/30 mb-8 transform -rotate-6 transition-transform hover:rotate-0">
            <Bike className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight uppercase leading-none">
            Pathar<br/>
            <span className="text-brand-600">Pratima</span>
          </h1>
          <p className="text-slate-400 font-bold mb-10 text-sm uppercase tracking-widest">
            Local Bike Taxi Network
          </p>

          <div className="space-y-4 mb-10">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100 mb-6"
              >
                {error}
              </motion.div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </div>

          <div className="pt-8 border-t border-slate-50 grid grid-cols-3 gap-6">
            <div className="text-center group">
              <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-xl mb-3 group-hover:bg-emerald-100 transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Safe Rides</div>
            </div>
            <div className="text-center group">
              <div className="inline-flex p-3 bg-brand-50 text-brand-600 rounded-xl mb-3 group-hover:bg-brand-100 transition-colors">
                <MapPin className="w-5 h-5" strokeWidth={3} />
              </div>
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Village Net</div>
            </div>
            <div className="text-center group">
              <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-xl mb-3 group-hover:bg-amber-100 transition-colors">
                <LogIn className="w-5 h-5" />
              </div>
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Fast Access</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1], 
            rotate: [0, 10, -10, 0],
            opacity: [0.5, 1, 0.5] 
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="bg-brand-50 p-8 rounded-[2.5rem]"
        >
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-black text-xl italic leading-none">CL</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  
  // Force onboarding if profile exists but incomplete
  if (profile && !profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/driver-onboarding" element={<DriverOnboarding />} />
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><DriverDashboard /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/ride/:rideId" element={<PrivateRoute><RideDetails /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

