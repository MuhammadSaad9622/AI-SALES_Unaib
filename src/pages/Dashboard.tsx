import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  TrendingUp, 
  Clock, 
  Users, 
  Target,
  PlayCircle,
  FileText,
  BarChart3,
  X,
  Chrome,
  Download
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { APIService } from '../lib/api';

interface Call {
  _id: string;
  title: string;
  duration: number;
  status: string;
  createdAt: string;
  performanceData: any;
  score?: number;
}

interface AnalyticsData {
  totalCalls: number;
  successRate: number;
  averageDuration: number;
  aiSuggestionsUsedRate: number;
  dailyCallData: any[];
  recentCalls: Call[];
}

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch analytics data
      const analyticsResponse = await APIService.getDashboardAnalytics();
      
      if (analyticsResponse.success) {
        setAnalyticsData(analyticsResponse.data);
        setRecentCalls(analyticsResponse.data.recentCalls || []);
      } else {
        // Fallback to just fetching calls if analytics fails
        const callsResponse = await APIService.getCalls({ limit: 4 });
        
        if (callsResponse.success) {
          setRecentCalls(callsResponse.data.calls || []);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      
      // Handle specific error types
      if (err.code && err.details) {
        // Use the detailed error information from the API
        console.error(`API Error (${err.code}): ${err.details}`);
      } else if (err.response?.status === 401) {
        // Handle authentication errors
        console.error('Authentication error. Please sign in again.');
        // Optionally redirect to login
        // window.location.href = '/signin';
      } else {
        // Generic error handling
        console.error('Failed to load dashboard data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCallScore = (performanceData: any) => {
    if (!performanceData || typeof performanceData !== 'object') {
      return Math.floor(Math.random() * 30) + 70;
    }
    return performanceData.score || Math.floor(Math.random() * 30) + 70;
  };

  const formatDuration = (duration: number): string => {
    if (duration < 60) {
      return `${duration}s`;
    }
    const minutes = Math.floor(duration / 60);
    return `${minutes}m`;
  };

  const downloadExtension = () => {
    // Use the actual extension file path
    const extensionUrl = '/extension.zip';
    
    // Create a temporary anchor element to trigger the download
    const downloadLink = document.createElement('a');
    downloadLink.href = extensionUrl;
    downloadLink.download = 'ai-sales-assistant.zip';
    
    // Append to the document, click, and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Track the download event
    try {
      APIService.trackEvent({
        eventType: 'extension_download',
        userId: profile?.id,
        metadata: {
          timestamp: new Date().toISOString(),
          browser: navigator.userAgent,
          version: '1.0.0'
        }
      });

      // Show success message
      toast({
        title: 'Extension Downloaded',
        description: 'Follow the installation instructions to start using the extension.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to track extension download:', error);
      
      // Show error message if tracking fails but download should still work
      toast({
        title: 'Extension Downloaded',
        description: 'Follow the installation instructions to start using the extension.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your sales calls today.
          </p>
        </div>
        <Button 
          variant="primary" 
          size="lg" 
          onClick={() => window.location.href = '/calls/new'}
        >
          <PlayCircle className="h-5 w-5 mr-2" />
          Start New Call
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Calls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card hover>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Calls</p>
                <h3 className="text-2xl font-bold">
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    analyticsData?.totalCalls || 0
                  )}
                </h3>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Success Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card hover>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <h3 className="text-2xl font-bold">
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    `${Math.round((analyticsData?.successRate || 0) * 100)}%`
                  )}
                </h3>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Avg Duration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card hover>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                <h3 className="text-2xl font-bold">
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    `${formatDuration(analyticsData?.averageDuration || 0)}`
                  )}
                </h3>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* AI Suggestions Used */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card hover>
            <div className="flex items-center">
                <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">AI Suggestions Used</p>
                  <h3 className="text-2xl font-bold">
                    {loading ? (
                      <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                    ) : (
                      `${Math.round((analyticsData?.aiSuggestionsUsedRate || 0) * 100)}%`
                    )}
                  </h3>
                </div>
              </div>
            </Card>
          </motion.div>
      </div>

      {/* Main Content Area with 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-4">
              <Button 
                variant="primary" 
                className="w-full justify-center bg-blue-500 hover:bg-blue-600 text-white shadow-md" 
                onClick={() => window.location.href = '/calls/new'}
              >
                <Phone className="h-5 w-5 mr-2" />
                Start Call
              </Button>
              <Button 
                variant="primary" 
                className="w-full justify-center bg-green-500 hover:bg-green-600 text-white shadow-md" 
                onClick={() => window.location.href = '/documents/upload'}
              >
                <FileText className="h-5 w-5 mr-2" />
                Upload Document
              </Button>
              <Button 
                variant="primary" 
                className="w-full justify-center bg-purple-500 hover:bg-purple-600 text-white shadow-md" 
                onClick={() => window.location.href = '/analytics'}
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                View Analytics
              </Button>
              <Button 
                variant="primary" 
                className="w-full justify-center bg-indigo-500 hover:bg-indigo-600 text-white shadow-md" 
                onClick={() => setShowExtensionModal(true)}
              >
                <Chrome className="h-5 w-5 mr-2" />
                Install Browser Extension
              </Button>

            </div>
          </div>
          
          {/* Today's Performance */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Today's Performance</h2>
            </div>
            <div className="p-6 space-y-5">
              {loading ? (
                                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={`loading-performance-${i}`} className="space-y-2">
                        <div className="flex justify-between">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full w-full"></div>
                      </div>
                    ))}
                  </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Calls Completed</span>
                      <span className="font-medium">
                        {analyticsData?.totalCalls || 0}/10
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, ((analyticsData?.totalCalls || 0) / 10) * 100)}%` }} 
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">AI Suggestions Used</span>
                      <span className="font-medium">
                        {Math.round((analyticsData?.aiSuggestionsUsedRate || 0) * 100)}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-success-600 h-2 rounded-full" 
                        style={{ width: `${(analyticsData?.aiSuggestionsUsedRate || 0) * 100}%` }} 
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Success Rate</span>
                      <span className="font-medium">
                        {Math.round((analyticsData?.successRate || 0) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-accent-600 h-2 rounded-full" 
                        style={{ width: `${(analyticsData?.successRate || 0) * 100}%` }} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column - Recent Calls */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Recent Calls</h2>
              <Button variant="secondary" size="sm" onClick={() => window.location.href = '/calls'}>
                View All
              </Button>
            </div>

            <div className="p-6">
              <Card>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={`loading-call-${i}`} className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="ml-4 flex-1">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                        </div>
                        <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : recentCalls && recentCalls.length > 0 ? (
                    <div className="space-y-4">
                      {recentCalls.map((call, index) => (
                        <motion.div
                          key={call._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          onClick={() => window.location.href = `/calls/${call._id}`}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center text-white font-medium">
                              {call.title?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{call.title || 'Untitled Call'}</p>
                              <p className="text-sm text-gray-600">
                                {formatDuration(call.duration || 0)} • {new Date(call.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className={`
                              px-3 py-1 rounded-full text-sm font-medium
                              ${(call.score || getCallScore(call.performanceData)) >= 80 
                                ? 'bg-success-100 text-success-600' 
                                : (call.score || getCallScore(call.performanceData)) >= 70 
                                ? 'bg-warning-100 text-warning-600'
                                : 'bg-error-100 text-error-600'
                              }
                            `}>
                              {call.score || getCallScore(call.performanceData)}%
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-medium">
                              {call.status}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                ) : (
                  <div className="text-center py-8">
                    <Phone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No calls yet. Start your first call to see it here!</p>
                  </div>
                )}
                  
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Extension Installation Modal */}
      {showExtensionModal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">Install Browser Extension</h2>
              <button
                onClick={() => setShowExtensionModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Features */}
                <div>
                  <h3 className="text-xl font-semibold mb-4">Features</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 text-primary-600 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium">Real-time AI Suggestions</span>
                        <p className="text-sm text-gray-600">Get intelligent sales suggestions during your calls</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 text-primary-600 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium">Live Transcription</span>
                        <p className="text-sm text-gray-600">Automatic speech-to-text for all your meetings</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 text-primary-600 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium">Multi-platform Support</span>
                        <p className="text-sm text-gray-600">Works with Google Meet, Zoom, MS Teams and more</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 text-primary-600 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium">Screen Sharing Safe</span>
                        <p className="text-sm text-gray-600">Extension UI is never visible when sharing your screen</p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Installation Steps */}
                <div>
                  <h3 className="text-xl font-semibold mb-4">Installation Steps</h3>
                  <ol className="space-y-4">
                    <li className="flex">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-sm font-medium">1</span>
                      </div>
                      <div>
                        <span className="font-medium">Download Extension</span>
                        <p className="text-sm text-gray-600">Click the download button below to get the extension file</p>
                      </div>
                    </li>
                    <li className="flex">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-sm font-medium">2</span>
                      </div>
                      <div>
                        <span className="font-medium">Load in Browser</span>
                        <p className="text-sm text-gray-600">For Chrome: Go to chrome://extensions, enable Developer mode, and click "Load unpacked" to select the extracted folder</p>
                      </div>
                    </li>
                    <li className="flex">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-sm font-medium">3</span>
                      </div>
                      <div>
                        <span className="font-medium">Start Using</span>
                        <p className="text-sm text-gray-600">Join a meeting and click on the extension icon in your browser toolbar to activate</p>
                      </div>
                    </li>
                  </ol>

                  {/* Action Buttons */}
                  <div className="mt-8 space-y-4">
                    <Button 
                      variant="primary" 
                      className="w-full justify-center" 
                      onClick={downloadExtension}
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Download Extension
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="w-full justify-center"
                      onClick={() => window.open('/extension-instructions', '_blank')}
                    >
                      View Full Instructions
                    </Button>
                  </div>
                </div>
              </div>

              {/* Browser Support */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-lg font-medium mb-3">Browser Support</h3>
                <div className="flex space-x-6">
                  <div className="flex items-center">
                    <Chrome className="h-6 w-6 text-blue-500 mr-2" />
                    <span>Chrome</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="h-6 w-6 text-blue-600 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                      <path d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
                    </svg>
                    <span>Edge</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="h-6 w-6 text-orange-500 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                      <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                    </svg>
                    <span>Firefox</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
