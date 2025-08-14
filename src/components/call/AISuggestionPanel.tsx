import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Lightbulb, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  MessageSquare,
  DollarSign,
  HelpCircle
} from 'lucide-react';
import { AISuggestion } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface AISuggestionPanelProps {
  suggestions: AISuggestion[];
  onUseSuggestion: (suggestionId: string) => void;
}

const getSuggestionIcon = (type: AISuggestion['type']) => {
  switch (type) {
    case 'objection_handling':
      return HelpCircle;
    case 'closing':
      return CheckCircle;
    case 'question':
      return MessageSquare;
    case 'pricing':
      return DollarSign;
    case 'feature_highlight':
      return TrendingUp;
    default:
      return Lightbulb;
  }
};

const getSuggestionColor = (type: AISuggestion['type']) => {
  switch (type) {
    case 'objection_handling':
      return 'text-warning-600 bg-warning-100';
    case 'closing':
      return 'text-success-600 bg-success-100';
    case 'question':
      return 'text-primary-600 bg-primary-100';
    case 'pricing':
      return 'text-accent-600 bg-accent-100';
    case 'feature_highlight':
      return 'text-purple-600 bg-purple-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const AISuggestionPanel: React.FC<AISuggestionPanelProps> = ({
  suggestions,
  onUseSuggestion
}) => {
  const activeSuggestions = suggestions.filter(s => !s.used);
  const usedSuggestions = suggestions.filter(s => s.used);

  return (
    <Card className="h-96">
      <div className="flex items-center mb-4">
        <Bot className="h-5 w-5 text-primary-600 mr-2" />
        <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
        <span className="ml-auto text-xs text-gray-500">
          {activeSuggestions.length} active
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto h-80">
        <AnimatePresence>
          {activeSuggestions.map((suggestion) => {
            const Icon = getSuggestionIcon(suggestion.type);
            const colorClasses = getSuggestionColor(suggestion.type);
            
            return (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-white to-gray-50"
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClasses}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {suggestion.type.replace('_', ' ')}
                      </span>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Now
                      </div>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed mb-3">
                      {suggestion.text}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Confidence: {Math.round(suggestion.confidence * 100)}%
                      </span>
                      <Button
                        size="sm"
                        onClick={() => onUseSuggestion(suggestion.id)}
                        className="text-xs"
                      >
                        Use Suggestion
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {activeSuggestions.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              AI is listening and will provide suggestions based on the conversation.
            </p>
          </div>
        )}

        {/* Used Suggestions */}
        {usedSuggestions.length > 0 && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Used Suggestions
            </h4>
            <div className="space-y-2">
              {usedSuggestions.slice(-3).map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-center space-x-2 text-xs text-gray-500 p-2 bg-gray-50 rounded"
                >
                  <CheckCircle className="h-3 w-3 text-success-500" />
                  <span className="truncate">{suggestion.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};