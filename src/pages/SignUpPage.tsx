import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Mail, Lock, User, ArrowRight, Bot, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const SignUpPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!name || !email || !password || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    if (password.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    if (!agreedToTerms) {
      showToast('Please agree to the Terms of Service', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      await signUp(email, password, name);
      showToast('Account created successfully! Please check your email to confirm your account.', 'success');
      navigate('/signin');
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      let errorMessage = 'Registration failed';
      let errorType = 'error';
      
      // Check for enhanced error properties
      if (error.code === 'AUTH_ERROR' && error.status === 409) {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'AUTH_ERROR' && error.message.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters long';
      } else if (error.code === 'AUTH_ERROR' && error.message.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address';
      } else if (error.message) {
        // Fallback to message-based checks for backward compatibility
        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address';
        } else {
          errorMessage = error.message;
        }
      }
      
      // If we have detailed error information, use it
      if (error.details && typeof error.details === 'string') {
        console.debug('Error details:', error.details);
      }
      
      showToast(errorMessage, errorType);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Real-time AI suggestions during calls',
    'Automatic transcription and analysis',
    'Performance tracking and analytics',
    'Document knowledge base integration'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Side - Features */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:block"
        >
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-accent-600 rounded-2xl mb-6"
            >
              <Bot className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Supercharge Your Sales Calls with AI
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Get real-time suggestions, automatic transcription, and performance insights to close more deals.
            </p>
            
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-success-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-success-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Side - Sign Up Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-md w-full mx-auto"
        >
          {/* Mobile Logo */}
          <div className="text-center mb-8 lg:hidden">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-accent-600 rounded-2xl mb-4"
            >
              <Bot className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600">Join AI Sales Assistant to boost your sales performance</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="hidden lg:block text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
              <p className="text-gray-600">Start your free trial today</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                fullWidth
                startIcon={<User size={18} />}
                required
              />
              
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
                helperText="Must be at least 8 characters"
                fullWidth
                startIcon={<Lock size={18} />}
                required
              />
              
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                fullWidth
                startIcon={<Lock size={18} />}
                required
              />
              
              <div className="flex items-start space-x-3">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                  I agree to the{' '}
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                    Privacy Policy
                  </a>
                </label>
              </div>
              
              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
                {!loading && <ArrowRight className="ml-2" size={18} />}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link 
                  to="/signin" 
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignUpPage;