import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Mail, Lock, ArrowRight, Bot } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const SignInPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      await signIn(email, password);
      showToast('Successfully signed in!', 'success');
      navigate('/');
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      let errorMessage = 'Sign in failed';
      let errorType = 'error';
      
      // Check for enhanced error properties
      if (error.code === 'AUTH_ERROR' && error.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'AUTH_ERROR' && error.status === 403) {
        errorMessage = 'Please check your email and confirm your account';
      } else if (error.message) {
        // Fallback to message-based checks for backward compatibility
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account';
        } else {
          errorMessage = error.message;
        }
      }
      
      // If we have detailed error information, use it
      if (error.details && typeof error.details === 'string') {
        console.debug('Error details:', error.details);
      }
      
      // For unauthorized errors, we might want to redirect to a specific page
      if (error.status === 401 || error.status === 403) {
        // Just show the toast for now, but we could redirect if needed
        // navigate('/unauthorized');
      }
      
      showToast(errorMessage, errorType);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-accent-600 rounded-2xl mb-4"
          >
            <Bot className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your AI Sales Assistant account</p>
        </div>
        
        {/* Sign In Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              fullWidth
              startIcon={<Mail size={18} />}
              required
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              fullWidth
              startIcon={<Lock size={18} />}
              required
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              
              <div className="text-sm">
                <a href="#" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                  Forgot password?
                </a>
              </div>
            </div>
            
            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
              {!loading && <ArrowRight className="ml-2" size={18} />}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Sign up now
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500 mb-4">Trusted by sales teams worldwide</p>
          <div className="flex justify-center space-x-8 text-xs text-gray-400">
            <span>Real-time AI Suggestions</span>
            <span>Live Transcription</span>
            <span>Performance Analytics</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SignInPage;