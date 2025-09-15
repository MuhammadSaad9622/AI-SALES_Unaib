import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { APIService } from "../lib/api";

interface TranscriptItem {
  _id?: string;
  speaker: string;
  text: string;
  confidence?: number;
  timestamp: string;
  isFinal?: boolean;
}

interface SuggestionItem {
  _id?: string;
  text: string;
  type: string;
  confidence?: number;
  reasoning?: string;
  priority?: string;
  createdAt?: string;
}

export const CallLog: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [callTitle, setCallTitle] = useState<string>("Call Log");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string>("");
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCall = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Use APIService.getCallLog with fallback to direct fetch
      let res;
      try {
        res = await APIService.getCallLog(id);
      } catch (apiError) {
        console.warn("APIService failed, trying direct fetch:", apiError);
        // Fallback to direct fetch if APIService fails
        const token = localStorage.getItem("authToken");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const raw = await fetch(`/api/calls/${id}/log`, {
          credentials: "include",
          headers,
        });

        if (!raw.ok) {
          throw new Error(`HTTP ${raw.status}: ${raw.statusText}`);
        }

        res = await raw.json();
      }

      if (res && res.success) {
        const call = res.data.call || null;
        setCallTitle(call?.title || `Call ${id}`);
        setTranscripts(res.data.transcripts || res.data.transcript || []);
        setSuggestions(res.data.suggestions || res.data.aiSuggestions || []);
      } else {
        console.error("Failed to load call", res);
        // Show user-friendly error
        alert(
          "Failed to load call data. Please ensure the backend server is running."
        );
      }
    } catch (err) {
      console.error("Error fetching call details:", err);
      // Check if it's a network error
      if (err instanceof Error && err.message.includes("Network Error")) {
        alert(
          "Cannot connect to the backend server. Please ensure the server is running on http://localhost:3002"
        );
      } else {
        alert(
          "Failed to load call data. Please check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!transcripts.length) {
      alert("No transcripts available to summarize.");
      return;
    }

    setGeneratingSummary(true);
    try {
      // First try using APIService
      let res;
      try {
        res = await APIService.generateCallSummary(id!);
      } catch (apiError) {
        console.warn("APIService failed, trying direct fetch:", apiError);
        // Fallback to direct fetch if APIService fails
        const token = localStorage.getItem("authToken");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/calls/${id}/summary`, {
          method: "POST",
          credentials: "include",
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        res = await response.json();
      }

      if (res && res.success && res.data && res.data.summary) {
        setSummary(res.data.summary);
      } else {
        throw new Error(
          res?.message ||
            "Failed to generate summary - no summary data received"
        );
      }
    } catch (error) {
      console.error("Error generating summary:", error);

      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (
          error.message.includes("Network Error") ||
          error.message.includes("ERR_NETWORK")
        ) {
          alert(
            "Cannot connect to the backend server. Please ensure the server is running on http://localhost:3002"
          );
        } else if (error.message.includes("500")) {
          alert(
            "Server error occurred while generating summary. Please check if OpenAI API key is configured on the backend."
          );
        } else if (error.message.includes("404")) {
          alert(
            "Summary endpoint not found. Please ensure you're using the latest backend version."
          );
        } else {
          alert(`Failed to generate summary: ${error.message}`);
        }
      } else {
        alert(
          "Failed to generate summary. Please ensure the backend is running and configured properly."
        );
      }
    } finally {
      setGeneratingSummary(false);
    }
  };

  const generatePDF = () => {
    if (!summary) {
      alert("Please generate a summary first.");
      return;
    }

    // Create hidden print content
    const printContent = `
      <div id="print-content" style="display: none;">
        <style>
          @page {
            size: A4;
            margin: 20mm;
            counter-increment: page;
            
            @bottom-center {
              content: "Page " counter(page);
              font-size: 9pt;
              color: #666;
              font-family: Arial, sans-serif;
            }
          }
          
          @media print {
            #print-content {
              display: block !important;
            }
            
            body * {
              visibility: hidden;
            }
            
            #print-content, #print-content * {
              visibility: visible;
            }
            
            #print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
            }
            
            html, body {
              min-height: 0 !important;
              height: auto !important;
              font-size: 11pt !important;
              background-color: #fff !important;
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
          
          .document {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            color: #333;
            background: white;
            font-size: 11pt;
            max-width: 100%;
          }
          
          .header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #000;
          }
          
          .title {
            font-size: 20pt;
            font-weight: bold;
            margin: 0 0 10px 0;
            color: #000;
          }
          
          .subtitle {
            font-size: 14pt;
            margin: 0 0 15px 0;
            color: #333;
          }
          
          .meta-info {
            font-size: 10pt;
            color: #666;
          }
          
          .content {
            margin-top: 20px;
          }
          
          .content h1,
          .content h2,
          .content h3,
          .content h4 {
            color: #000;
            margin: 20px 0 10px 0;
            font-weight: bold;
          }
          
          .content h1 { font-size: 16pt; }
          .content h2 { font-size: 14pt; }
          .content h3 { font-size: 13pt; }
          .content h4 { font-size: 12pt; }
          
          .content p {
            margin: 0 0 12px 0;
            text-align: justify;
            line-height: 1.6;
          }
          
          .content ul,
          .content ol {
            margin: 10px 0 15px 20px;
            padding-left: 0;
          }
          
          .content li {
            margin-bottom: 6px;
            line-height: 1.5;
          }
          
          .content ul li {
            list-style-type: disc;
          }
          
          .content ol li {
            list-style-type: decimal;
          }
          
          .content strong {
            font-weight: bold;
          }
        </style>
        
        <div class="document">
          <div class="header">
            <h1 class="title">Call Summary Report</h1>
            <p class="subtitle">${callTitle}</p>
            <div class="meta-info">
              Call ID: ${id} | Generated: ${new Date().toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    )} at ${new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}
            </div>
          </div>
          
          <div class="content">
            ${(() => {
              // Process the summary to create structured HTML
              let processedSummary = summary;

              // Convert **SECTION HEADERS** to proper headings
              processedSummary = processedSummary.replace(
                /\*\*(.*?)\*\*/g,
                "<h3>$1</h3>"
              );

              // Split into sections for better processing
              const sections = processedSummary.split(/(?=<h3>)/);

              return sections
                .map((section) => {
                  if (!section.trim()) return "";

                  // Process bullet points (lines starting with -)
                  let processed = section.replace(
                    /(^|\n)- (.*?)(?=\n|$)/g,
                    (_, prefix, content) => {
                      return `${prefix}<li>${content.trim()}</li>`;
                    }
                  );

                  // Wrap consecutive <li> elements in <ul>
                  processed = processed.replace(
                    /(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/gs,
                    (match) => {
                      return `<ul>${match}</ul>`;
                    }
                  );

                  // Process numbered lists (lines starting with numbers)
                  processed = processed.replace(
                    /(^|\n)(\d+\.\s)(.*?)(?=\n|$)/g,
                    (_, prefix, __, content) => {
                      return `${prefix}<li>${content.trim()}</li>`;
                    }
                  );

                  // Wrap consecutive numbered <li> elements in <ol>
                  processed = processed.replace(
                    /(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/gs,
                    (match) => {
                      // Only convert to <ol> if it doesn't already have <ul> wrapper
                      if (!match.includes("<ul>")) {
                        return `<ol>${match}</ol>`;
                      }
                      return match;
                    }
                  );

                  // Convert remaining line breaks to paragraphs
                  const lines = processed.split("\n");
                  let result = "";
                  let currentParagraph = "";

                  for (let line of lines) {
                    line = line.trim();
                    if (!line) {
                      if (currentParagraph) {
                        // Don't wrap headings, lists in paragraphs
                        if (
                          !currentParagraph.includes("<h3>") &&
                          !currentParagraph.includes("<ul>") &&
                          !currentParagraph.includes("<ol>") &&
                          !currentParagraph.includes("<li>")
                        ) {
                          result += `<p>${currentParagraph}</p>`;
                        } else {
                          result += currentParagraph;
                        }
                        currentParagraph = "";
                      }
                    } else if (
                      line.includes("<h3>") ||
                      line.includes("<ul>") ||
                      line.includes("<ol>")
                    ) {
                      if (currentParagraph) {
                        result += `<p>${currentParagraph}</p>`;
                        currentParagraph = "";
                      }
                      result += line;
                    } else {
                      currentParagraph += (currentParagraph ? " " : "") + line;
                    }
                  }

                  // Handle remaining paragraph
                  if (currentParagraph) {
                    if (
                      !currentParagraph.includes("<h3>") &&
                      !currentParagraph.includes("<ul>") &&
                      !currentParagraph.includes("<ol>")
                    ) {
                      result += `<p>${currentParagraph}</p>`;
                    } else {
                      result += currentParagraph;
                    }
                  }

                  return result;
                })
                .join("");
            })()}
          </div>
        </div>
      </div>
    `;

    // Remove existing print content if any
    const existingPrintContent = document.getElementById("print-content");
    if (existingPrintContent) {
      existingPrintContent.remove();
    }

    // Add print content to the document
    document.body.insertAdjacentHTML("beforeend", printContent);

    // Trigger print dialog
    window.print();

    // Clean up after printing (with delay to ensure print dialog has processed)
    setTimeout(() => {
      const printElement = document.getElementById("print-content");
      if (printElement) {
        printElement.remove();
      }
    }, 1000);
  };

  // Combine and sort transcripts and suggestions by timestamp
  const getCombinedMessages = () => {
    const messages: Array<{
      type: "transcript" | "suggestion";
      timestamp: string;
      data: TranscriptItem | SuggestionItem;
    }> = [];

    // Add transcripts
    transcripts.forEach((transcript) => {
      messages.push({
        type: "transcript",
        timestamp: transcript.timestamp,
        data: transcript,
      });
    });

    // Add suggestions
    suggestions.forEach((suggestion) => {
      messages.push({
        type: "suggestion",
        timestamp: suggestion.createdAt || new Date().toISOString(),
        data: suggestion,
      });
    });

    // Sort by timestamp
    return messages.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const combinedMessages = getCombinedMessages();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">{callTitle}</h1>
          <div className="flex space-x-3">
            <button
              onClick={generateSummary}
              disabled={generatingSummary || !transcripts.length}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              {generatingSummary ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Generate Summary
                </>
              )}
            </button>
            <button
              onClick={generatePDF}
              disabled={!summary}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export PDF
            </button>
          </div>
        </div>
        {summary && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">
              AI Generated Summary
            </h3>
            <p className="text-sm text-blue-700 whitespace-pre-wrap">
              {summary}
            </p>
          </div>
        )}
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-500">Loading conversation...</div>
          </div>
        ) : combinedMessages.length ? (
          <div className="max-w-4xl mx-auto space-y-3">
            {combinedMessages.map((message, index) => {
              if (message.type === "transcript") {
                const transcript = message.data as TranscriptItem;
                return (
                  <div
                    key={transcript._id || transcript.timestamp + index}
                    className="flex justify-start items-end"
                  >
                    <div className="max-w-xs lg:max-w-md">
                      {/* Speaker name */}
                      <div className="text-xs text-gray-500 mb-1 px-1">
                        {transcript.speaker}
                      </div>
                      {/* Message bubble - iPhone style gray */}
                      <div className="bg-gray-300 text-black rounded-3xl px-4 py-3 shadow-sm relative">
                        <div className="text-sm leading-relaxed">
                          {transcript.text}
                        </div>
                      </div>
                      {/* Timestamp */}
                      <div className="text-xs text-gray-400 mt-1 px-1">
                        {new Date(transcript.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              } else {
                const suggestion = message.data as SuggestionItem;
                return (
                  <div
                    key={suggestion._id || index}
                    className="flex justify-end items-end"
                  >
                    <div className="max-w-xs lg:max-w-md">
                      {/* AI label */}
                      <div className="text-xs text-gray-500 mb-1 px-1 text-right">
                        AI Assistant • {suggestion.type}
                      </div>
                      {/* Message bubble - iPhone style blue */}
                      <div className="bg-blue-500 text-white rounded-3xl px-4 py-3 shadow-sm relative">
                        <div className="text-sm leading-relaxed">
                          {suggestion.text}
                        </div>
                        {suggestion.reasoning && (
                          <div className="text-xs text-blue-100 mt-2 italic opacity-90">
                            {suggestion.reasoning}
                          </div>
                        )}
                        {suggestion.confidence && (
                          <div className="text-xs text-blue-100 mt-1 opacity-75">
                            Confidence:{" "}
                            {Math.round(suggestion.confidence * 100)}%
                          </div>
                        )}
                      </div>
                      {/* Timestamp */}
                      <div className="text-xs text-gray-400 mt-1 px-1 text-right">
                        {suggestion.createdAt
                          ? new Date(suggestion.createdAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : ""}
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        ) : (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-500">No conversation data available.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallLog;
