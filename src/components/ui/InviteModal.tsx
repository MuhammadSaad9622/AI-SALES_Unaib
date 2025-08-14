import React, { useState } from 'react';
import { X, Mail, Users, Copy, Send } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendInvites: (emails: string[]) => void;
  meetingData: any;
  isLoading?: boolean;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  onSendInvites,
  meetingData,
  isLoading = false
}) => {
  const [emails, setEmails] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');

  const addEmail = () => {
    if (currentEmail.trim() && isValidEmail(currentEmail.trim())) {
      if (!emailList.includes(currentEmail.trim())) {
        setEmailList([...emailList, currentEmail.trim()]);
        setCurrentEmail('');
      }
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmailList(emailList.filter(email => email !== emailToRemove));
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendInvites = () => {
    if (emailList.length > 0) {
      onSendInvites(emailList);
    }
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(meetingData.joinUrl);
    // You could add a toast notification here
  };

  const copyMeetingDetails = () => {
    const details = `Meeting ID: ${meetingData.meetingId}\nPassword: ${meetingData.password}\nJoin URL: ${meetingData.joinUrl}`;
    navigator.clipboard.writeText(details);
    // You could add a toast notification here
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Send Meeting Invites</h2>
                <p className="text-blue-100 text-sm">Invite participants to your AI Sales meeting</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Meeting Details */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Meeting Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Meeting Topic</label>
                <p className="text-gray-900 font-medium">{meetingData.topic}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Meeting ID</label>
                <div className="flex items-center space-x-2">
                  <p className="text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                    {meetingData.meetingId}
                  </p>
                  <button
                    onClick={copyMeetingDetails}
                    className="text-blue-600 hover:text-blue-700"
                    title="Copy meeting details"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Password</label>
                <p className="text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                  {meetingData.password}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Join Link</label>
                <div className="flex items-center space-x-2">
                  <p className="text-blue-600 text-sm truncate bg-white px-2 py-1 rounded border">
                    {meetingData.joinUrl}
                  </p>
                  <button
                    onClick={copyMeetingLink}
                    className="text-blue-600 hover:text-blue-700"
                    title="Copy join link"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Add Email Addresses
            </label>
            <div className="flex space-x-2">
              <input
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                placeholder="Enter email address"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addEmail}
                disabled={!isValidEmail(currentEmail)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Email List */}
          {emailList.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Recipients ({emailList.length})
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {emailList.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
                  >
                    <span className="text-blue-900 text-sm">{email}</span>
                    <button
                      onClick={() => removeEmail(email)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Add Templates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quick Add Common Domains
            </label>
            <div className="flex flex-wrap gap-2">
              {['gmail.com', 'outlook.com', 'yahoo.com', 'company.com'].map((domain) => (
                <button
                  key={domain}
                  onClick={() => setCurrentEmail(`user@${domain}`)}
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
                >
                  @{domain}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {emailList.length > 0 ? (
              <span>Ready to send invites to {emailList.length} recipient{emailList.length > 1 ? 's' : ''}</span>
            ) : (
              <span>Add email addresses to send invites</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendInvites}
              disabled={emailList.length === 0 || isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Invites</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 