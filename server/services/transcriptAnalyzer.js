class TranscriptAnalyzer {
  constructor() {
    this.lastSuggestionTime = 0;
    this.currentSpeaker = null;
    this.speakerTranscripts = new Map();
    this.lastTranscriptTime = 0;
    this.allTranscripts = [];

    this.config = {
      MIN_WORDS_FOR_ANALYSIS: 20,
      MIN_TIME_BETWEEN_SUGGESTIONS: 30000, // 30 seconds
      MAX_TIME_WITHOUT_SUGGESTION: 120000, // 2 minutes
      LONG_PAUSE_THRESHOLD: 7000, // 7 seconds
      MAX_TRANSCRIPT_HISTORY: 50,
    };
  }

  addTranscript(transcriptData) {
    const now = Date.now();
    this.lastTranscriptTime = now;

    // Store transcript
    this.allTranscripts.push({
      speaker: transcriptData.speaker,
      text: transcriptData.text,
      timestamp: now,
    });

    // Keep only recent transcripts
    if (this.allTranscripts.length > this.config.MAX_TRANSCRIPT_HISTORY) {
      this.allTranscripts = this.allTranscripts.slice(
        -this.config.MAX_TRANSCRIPT_HISTORY
      );
    }

    // Update speaker transcripts map
    const speaker = transcriptData.speaker;
    if (!this.speakerTranscripts.has(speaker)) {
      this.speakerTranscripts.set(speaker, []);
    }

    this.speakerTranscripts.get(speaker).push({
      text: transcriptData.text,
      timestamp: now,
    });

    // Keep only recent transcripts per speaker
    const speakerTexts = this.speakerTranscripts.get(speaker);
    if (speakerTexts.length > 10) {
      this.speakerTranscripts.set(speaker, speakerTexts.slice(-10));
    }
  }

  shouldGenerateSuggestion(transcriptData) {
    const now = Date.now();
    const timeSinceLastSuggestion = now - this.lastSuggestionTime;
    const timeSinceLastTranscript = now - this.lastTranscriptTime;

    // Get recent context
    const recentContext = this.getRecentContext();
    const wordCount = recentContext
      .split(" ")
      .filter((word) => word.length > 0).length;

    if (wordCount < this.config.MIN_WORDS_FOR_ANALYSIS) {
      return null;
    }

    // Priority 1: Speaker change detection
    if (
      this.detectSpeakerChange(transcriptData.speaker) &&
      timeSinceLastSuggestion >= this.config.MIN_TIME_BETWEEN_SUGGESTIONS
    ) {
      return {
        trigger: "speaker_change",
        context: recentContext,
        previousSpeaker: this.currentSpeaker,
        currentSpeaker: transcriptData.speaker,
      };
    }

    // Priority 2: Long pause with content
    if (
      timeSinceLastTranscript >= this.config.LONG_PAUSE_THRESHOLD &&
      timeSinceLastSuggestion >= this.config.MIN_TIME_BETWEEN_SUGGESTIONS
    ) {
      return {
        trigger: "long_pause",
        context: recentContext,
        pauseDuration: timeSinceLastTranscript,
      };
    }

    // Priority 3: Every 60 seconds
    if (
      timeSinceLastSuggestion >= 60000 // 60 seconds
    ) {
      return {
        trigger: "interval_60sec",
        context: recentContext,
      };
    }

    // Priority 4: Time-based fallback
    if (timeSinceLastSuggestion >= this.config.MAX_TIME_WITHOUT_SUGGESTION) {
      return {
        trigger: "time_based",
        context: recentContext,
      };
    }

    return null;
  }

  detectSpeakerChange(newSpeaker) {
    const changed = this.currentSpeaker && this.currentSpeaker !== newSpeaker;
    this.currentSpeaker = newSpeaker;
    return changed;
  }

  getRecentContext(maxWords = 100) {
    const recentTranscripts = this.allTranscripts.slice(-10);
    const contextText = recentTranscripts
      .map((t) => `${t.speaker}: ${t.text}`)
      .join(" ");

    const words = contextText.split(" ");
    if (words.length > maxWords) {
      return words.slice(-maxWords).join(" ");
    }

    return contextText;
  }

  markSuggestionGenerated() {
    this.lastSuggestionTime = Date.now();
  }

  getConversationSummary() {
    const speakers = Array.from(this.speakerTranscripts.keys());
    const summary = {
      totalTranscripts: this.allTranscripts.length,
      speakers: speakers,
      lastActivity: this.lastTranscriptTime,
      conversationDuration:
        this.lastTranscriptTime - (this.allTranscripts[0]?.timestamp || 0),
    };

    return summary;
  }
}

export default TranscriptAnalyzer;
