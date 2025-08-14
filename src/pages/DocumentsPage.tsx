import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Link, 
  Search, 
  Filter,
  MoreVertical,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Document } from '../types';
import { APIService } from '../lib/api';
// Using browser's built-in alert instead of toast
// import { toast } from 'react-hot-toast';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'processed' | 'pending'>('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [aiSuggestions, setAISuggestions] = useState<{ [id: string]: any }>({});
  const [aiLoading, setAILoading] = useState<{ [id: string]: boolean }>({});
  const [showSuggestion, setShowSuggestion] = useState<{ [id: string]: boolean }>({});
  
  // Fetch documents when component mounts
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const data = await APIService.getDocuments();
        setDocuments(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching documents:', err);
        
        // Display enhanced error messages if available
        if (err.code && err.details) {
          // Use the detailed error information
          setError(`${err.message}: ${err.details}`);
        } else if (err.response?.status === 401) {
          // Let the interceptor handle 401 errors for redirection
          setError('Authentication error. Please sign in again.');
        } else {
          setError('Failed to load documents. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    // Check for token in localStorage
    const checkAuthAndFetch = async () => {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        fetchDocuments();
        return;
      }
      
      // No token found
      setError('You need to be signed in to view documents.');
      setLoading(false);
    };
    
    checkAuthAndFetch();
  }, []);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'processed' && doc.processed) ||
                         (selectedFilter === 'pending' && !doc.processed);
    
    return matchesSearch && matchesFilter;
  });

  const getDocumentIcon = (type: Document['type']) => {
    switch (type) {
      case 'pdf':
        return FileText;
      case 'url':
        return Link;
      default:
        return FileText;
    }
  };

  const getStatusIcon = (processed: boolean) => {
    return processed ? CheckCircle : Clock;
  };

  const getStatusColor = (processed: boolean) => {
    return processed 
      ? 'text-success-600 bg-success-100' 
      : 'text-warning-600 bg-warning-100';
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
      
      // Auto-fill the document name field with the file name (without extension)
      const fileName = file.name.split('.').slice(0, -1).join('.');
      const nameInput = document.getElementById('file-name') as HTMLInputElement;
      if (nameInput && !nameInput.value) {
        nameInput.value = fileName;
      }
    }
  };

  // Handle document upload
  const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    try {
      setIsUploadModalOpen(false);
      alert('Uploading document...');
      
      const newDocument = await APIService.uploadDocument(formData);
      setDocuments(prev => [newDocument, ...prev]);
      setSelectedFile(null); // Reset selected file after successful upload
      
      alert('Document uploaded successfully');
    } catch (err) {
      console.error('Error uploading document:', err);
      
      // Display enhanced error messages if available
      if (err.code && err.details) {
        alert(`Upload failed: ${err.details}`);
      } else if (err.response?.status === 401) {
        alert('Authentication error. Please sign in again.');
      } else {
        alert('Failed to upload document. Please try again later.');
      }
    }
  };

  // Handle URL document creation
  const handleUrlSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const url = (form.elements.namedItem('url') as HTMLInputElement).value;
    const tagsInput = (form.elements.namedItem('tags') as HTMLInputElement).value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
    
    try {
      setIsUploadModalOpen(false);
      alert('Adding URL document...');
      
      const newDocument = await APIService.createUrlDocument({ name, url, tags });
      setDocuments(prev => [newDocument, ...prev]);
      
      alert('URL document added successfully');
    } catch (err) {
      console.error('Error adding URL document:', err);
      
      // Display enhanced error messages if available
      if (err.code && err.details) {
        alert(`Failed to add URL: ${err.details}`);
      } else if (err.response?.status === 401) {
        alert('Authentication error. Please sign in again.');
      } else {
        alert('Failed to add URL document. Please try again later.');
      }
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (id: string) => {
    try {
      alert('Deleting document...');
      
      await APIService.deleteDocument(id);
      setDocuments(prev => prev.filter(doc => doc._id !== id));
      
      alert('Document deleted successfully');
    } catch (err) {
      console.error('Error deleting document:', err);
      
      // Display enhanced error messages if available
      if (err.code && err.details) {
        alert(`Delete failed: ${err.details}`);
      } else if (err.response?.status === 401) {
        alert('Authentication error. Please sign in again.');
      } else {
        alert('Failed to delete document. Please try again later.');
      }
    }
  };

  const handleAISuggestion = async (id: string) => {
    setAILoading(prev => ({ ...prev, [id]: true }));
    try {
      const data = await APIService.getDocumentAISuggestion(id);
      setAISuggestions(prev => ({ ...prev, [id]: data }));
      setShowSuggestion(prev => ({ ...prev, [id]: true }));
    } catch (err) {
      alert(err.details || 'Failed to get AI suggestion');
    } finally {
      setAILoading(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">
            Manage your knowledge base for AI-powered call assistance.
          </p>
        </div>
        <Button 
          variant="primary" 
          size="lg"
          onClick={() => setIsUploadModalOpen(true)}
        >
          <Upload className="h-5 w-5 mr-2" />
          Upload Document
        </Button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600">{error}</p>
              {error.includes('Authentication') && (
                <div className="mt-2 flex space-x-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => window.location.href = '/signin'}
                  >
                    Go to Sign In
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Documents</option>
              <option value="processed">Processed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms.' : 'Upload your first document to get started.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredDocuments.map((document, index) => {
              const Icon = getDocumentIcon(document.type);
              const StatusIcon = getStatusIcon(document.processed);
              const uploadDate = new Date(document.uploadDate);
              
              return (
                <motion.div
                  key={document._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card hover className="relative">
                    <div className="absolute top-4 right-4">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {document.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {document.type.toUpperCase()} • {uploadDate.toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`
                          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${getStatusColor(document.processed)}
                        `}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {document.processed ? 'Processed' : 'Processing'}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {document.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => window.open(APIService.getDocumentDownloadUrl(document._id), '_blank')}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleDeleteDocument(document._id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAISuggestion(document._id)}
                      disabled={aiLoading[document._id]}
                      className="ml-2 mt-4"
                    >
                      {aiLoading[document._id] ? 'Loading...' : 'AI Suggestion'}
                    </Button>
                    {showSuggestion[document._id] && aiSuggestions[document._id] && (
                      <div className="mt-4 space-y-3">
                        {aiSuggestions[document._id].suggestion.detailedSummary && (
                          <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 mb-3">
                            <h4 className="font-medium text-gray-900 mb-2">Executive Summary</h4>
                            <p className="text-gray-600">{aiSuggestions[document._id].suggestion.detailedSummary}</p>
                          </div>
                        )}
                        {aiSuggestions[document._id].suggestion.keyFeatures?.length > 0 && (
                          <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Key Features</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {aiSuggestions[document._id].suggestion.keyFeatures.map((feature: string, index: number) => (
                                <li key={index} className="text-gray-600">{feature}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiSuggestions[document._id].suggestion.benefits?.length > 0 && (
                          <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Benefits</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {aiSuggestions[document._id].suggestion.benefits.map((benefit: string, index: number) => (
                                <li key={index} className="text-gray-600">{benefit}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiSuggestions[document._id].suggestion.useCases?.length > 0 && (
                          <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Use Cases</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {aiSuggestions[document._id].suggestion.useCases.map((useCase: string, index: number) => (
                                <li key={index} className="text-gray-600">{useCase}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiSuggestions[document._id].suggestion.pricing_info?.length > 0 && (
                          <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Pricing Information</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {aiSuggestions[document._id].suggestion.pricing_info.map((info: string, index: number) => (
                                <li key={index} className="text-gray-600">{info}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiSuggestions[document._id].suggestion.competitive_advantages?.length > 0 && (
                          <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Competitive Advantages</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {aiSuggestions[document._id].suggestion.competitive_advantages.map((advantage: string, index: number) => (
                                <li key={index} className="text-gray-600">{advantage}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiSuggestions[document._id].suggestion.target_audience?.length > 0 && (
                          <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Target Audience</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {aiSuggestions[document._id].suggestion.target_audience.map((audience: string, index: number) => (
                                <li key={index} className="text-gray-600">{audience}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiSuggestions[document._id].suggestion.success_stories?.length > 0 && (
                          <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Success Stories</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {aiSuggestions[document._id].suggestion.success_stories.map((story: string, index: number) => (
                                <li key={index} className="text-gray-600">{story}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiSuggestions[document._id].suggestion.objection_responses?.length > 0 && (
                          <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Objection Responses</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {aiSuggestions[document._id].suggestion.objection_responses.map((item: any, index: number) => (
                                <li key={index} className="text-gray-600">
                                  <span className="font-medium">{item.objection}:</span> {item.response}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowSuggestion(prev => ({ ...prev, [document._id]: false }))}
                          className="mt-2"
                        >
                          Hide Suggestion
                        </Button>
                      </div>
                    )}
                  </Card>
                  
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {filteredDocuments.length === 0 && (
        <Card className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms.' : 'Upload your first document to get started.'}
          </p>
        </Card>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setSelectedFile(null);
          // Reset form fields
          setTimeout(() => {
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            const nameInput = document.getElementById('file-name') as HTMLInputElement;
            const tagsInput = document.getElementById('file-tags') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            if (nameInput) nameInput.value = '';
            if (tagsInput) tagsInput.value = '';
          }, 300); // Small delay to ensure modal is closed first
        }}
        title="Add Document"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload File</h3>
            <form onSubmit={handleFileUpload}>
              <div 
                className={`border-2 border-dashed ${selectedFile ? 'border-primary-300 bg-primary-50' : 'border-gray-300'} rounded-lg p-6 text-center`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.add('border-primary-500');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('border-primary-500');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('border-primary-500');
                  
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    // Check if file type is acceptable
                    const acceptedTypes = ['.pdf', '.docx', '.txt', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
                    const fileType = file.type || file.name.split('.').pop();
                    
                    if (acceptedTypes.some(type => fileType.includes(type))) {
                      // Update the file input
                      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                      if (fileInput) {
                        // Create a DataTransfer to set the file input value
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        
                        // Trigger change event manually
                        const event = new Event('change', { bubbles: true });
                        fileInput.dispatchEvent(event);
                      }
                    } else {
                      alert('Invalid file type. Please upload PDF, DOCX, or TXT files only.');
                    }
                  }
                }}
              >
                <Upload className={`h-8 w-8 ${selectedFile ? 'text-primary-500' : 'text-gray-400'} mx-auto mb-2`} />
                <p className="text-sm text-gray-600 mb-2">Drag and drop your file here, or click to browse</p>
                <p className="text-xs text-gray-500">PDF, DOCX, TXT (Max 10MB)</p>
                <input 
                  type="file" 
                  name="file"
                  className="hidden" 
                  id="file-upload" 
                  required 
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.txt"
                />
                {selectedFile ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-center space-x-2 text-sm text-primary-600">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium truncate max-w-xs">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="secondary"
                      className="mt-2"
                      onClick={() => {
                        setSelectedFile(null);
                        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                    >
                      Change File
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="file-upload">
                    <Button 
                      type="button" 
                      className="mt-4"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Select File
                    </Button>
                  </label>
                )}
              </div>
              
              <div className="mt-4">
                <label htmlFor="file-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Document Name
                </label>
                <input
                  type="text"
                  id="file-name"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. Product Brochure"
                  required
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="file-tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  id="file-tags"
                  name="tags"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. product, marketing"
                />
              </div>
              
              <Button type="submit" className="w-full mt-4">Upload Document</Button>
            </form>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add URL</h3>
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label htmlFor="url-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="url-name"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. Company Website"
                  required
                />
              </div>
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="url-tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  id="url-tags"
                  name="tags"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. website, reference"
                />
              </div>
              <Button type="submit" className="w-full">Add URL</Button>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};