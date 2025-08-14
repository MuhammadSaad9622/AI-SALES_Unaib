import React, { createContext, useContext, useState, useEffect } from 'react';
import { APIService } from '../lib/api';

interface Profile {
  _id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  department: string | null;
  phone: string | null;
  role: string;
  preferences?: any;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: Profile | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and validate
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          const response = await APIService.getProfile();
          if (response.success) {
            setUser(response.data.user);
          } else {
            // If the response is not successful but no error was thrown
            console.warn('Token validation returned unsuccessful response:', response);
            // Don't remove token here, let the interceptor handle it
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          // Don't remove token here, let the interceptor handle it
          // This prevents race conditions and multiple redirects
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    
    try {
      const response = await APIService.register(name, email, password);
      
      if (response.success) {
        // Store token in localStorage
        localStorage.setItem('authToken', response.data.token);
        
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Extract detailed error information if available
      const errorDetails = error.response?.data || {};
      const enhancedError = new Error(errorDetails.message || error.message || 'Registration failed');
      
      // Add additional properties to the error
      enhancedError.code = errorDetails.code || 'AUTH_ERROR';
      enhancedError.details = errorDetails.details || 'An error occurred during registration';
      enhancedError.status = error.response?.status;
      
      throw enhancedError;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const response = await APIService.login(email, password);
      
      if (response.success) {
        // Store token in localStorage
        localStorage.setItem('authToken', response.data.token);
        
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Extract detailed error information if available
      const errorDetails = error.response?.data || {};
      const enhancedError = new Error(errorDetails.message || error.message || 'Login failed');
      
      // Add additional properties to the error
      enhancedError.code = errorDetails.code || 'AUTH_ERROR';
      enhancedError.details = errorDetails.details || 'An error occurred during login';
      enhancedError.status = error.response?.status;
      
      throw enhancedError;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    
    try {
      // Clear localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const response = await APIService.updateProfile(updates);
      
      if (response.success) {
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      
      // Extract detailed error information if available
      const errorDetails = error.response?.data || {};
      const enhancedError = new Error(errorDetails.message || error.message || 'Profile update failed');
      
      // Add additional properties to the error
      enhancedError.code = errorDetails.code || 'PROFILE_ERROR';
      enhancedError.details = errorDetails.details || 'An error occurred while updating your profile';
      enhancedError.status = error.response?.status;
      
      throw enhancedError;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile: user, // For compatibility
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};