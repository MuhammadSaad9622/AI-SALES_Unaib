import React, { useState } from 'react';
import APIService from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FileText, Send, Loader } from 'lucide-react';

const TextProcessorPage: React.FC = () => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('Please enter some text to process');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      const data = await APIService.processTextForAISuggestion(text);
      setResult(data);
    } catch (err: any) {
      console.error('Error processing text:', err);
      setError(err.details || err.message || 'Failed to process text');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Text Processor</h1>
        <p className="text-gray-600 mt-1">
          Process text directly for AI-powered sales suggestions.
        </p>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Input Text</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <textarea
                className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Paste or type your text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <Button 
              type="submit" 
              disabled={isProcessing || !text.trim()}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Process Text
                </>
              )}
            </Button>
          </form>
        </Card>
        
        {/* Results */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">AI Suggestions</h2>
          
          {!result ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <FileText className="h-12 w-12 mb-4" />
              <p>Process text to see AI suggestions</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-auto max-h-[500px]">
              {/* Executive Summary */}
              {result.suggestion.detailed_summary && (
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 mb-3">
                  <h4 className="font-medium text-gray-900 mb-2">Executive Summary</h4>
                  <p className="text-gray-600">{result.suggestion.detailed_summary}</p>
                </div>
              )}
              
              {/* Key Features */}
              {result.suggestion.key_features?.length > 0 && (
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Key Features</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.suggestion.key_features.map((feature: string, index: number) => (
                      <li key={index} className="text-gray-600">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Benefits */}
              {result.suggestion.benefits?.length > 0 && (
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Benefits</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.suggestion.benefits.map((benefit: string, index: number) => (
                      <li key={index} className="text-gray-600">{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Use Cases */}
              {result.suggestion.use_cases?.length > 0 && (
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Use Cases</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.suggestion.use_cases.map((useCase: string, index: number) => (
                      <li key={index} className="text-gray-600">{useCase}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Pricing Info */}
              {result.suggestion.pricing_info?.length > 0 && (
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Pricing Information</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.suggestion.pricing_info.map((info: string, index: number) => (
                      <li key={index} className="text-gray-600">{info}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Competitive Advantages */}
              {result.suggestion.competitive_advantages?.length > 0 && (
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Competitive Advantages</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.suggestion.competitive_advantages.map((advantage: string, index: number) => (
                      <li key={index} className="text-gray-600">{advantage}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Target Audience */}
              {result.suggestion.target_audience?.length > 0 && (
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Target Audience</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.suggestion.target_audience.map((audience: string, index: number) => (
                      <li key={index} className="text-gray-600">{audience}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Success Stories */}
              {result.suggestion.success_stories?.length > 0 && (
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Success Stories</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.suggestion.success_stories.map((story: string, index: number) => (
                      <li key={index} className="text-gray-600">{story}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Objection Responses */}
              {result.suggestion.objection_responses?.length > 0 && (
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Objection Responses</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.suggestion.objection_responses.map((item: any, index: number) => (
                      <li key={index} className="text-gray-600">
                        <span className="font-medium">{item.objection}:</span> {item.response}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TextProcessorPage;