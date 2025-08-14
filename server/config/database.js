import mongoose from 'mongoose';
import config from './config.js';

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      // Set mongoose options
      mongoose.set('strictQuery', false);

      // Connection options
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
        bufferCommands: false // Disable mongoose buffering
        // bufferMaxEntries option is no longer supported in newer MongoDB driver versions
      };

      // Connect to MongoDB
      this.connection = await mongoose.connect(config.MONGODB_URI, options);

      console.log(`✅ MongoDB connected: ${this.connection.connection.host}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️  MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      // Handle process termination
      process.on('SIGINT', this.gracefulShutdown.bind(this));
      process.on('SIGTERM', this.gracefulShutdown.bind(this));

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
    }
  }

  async gracefulShutdown(signal) {
    console.log(`\n🔄 Received ${signal}. Gracefully shutting down...`);
    
    try {
      await this.disconnect();
      console.log('✅ Database connection closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      return {
        status: states[state] || 'unknown',
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  // Get database statistics
  async getStats() {
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects
      };
    } catch (error) {
      throw new Error(`Failed to get database stats: ${error.message}`);
    }
  }

  // Create indexes for better performance
  async createIndexes() {
    try {
      console.log('🔄 Creating database indexes...');

      // Import models to ensure indexes are created
      await import('../models/User.js');
      await import('../models/Call.js');
      await import('../models/Document.js');
      await import('../models/Transcript.js');
      await import('../models/AISuggestion.js');

      // Ensure indexes are created
      await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
      await mongoose.connection.db.collection('calls').createIndex({ user: 1, createdAt: -1 });
      await mongoose.connection.db.collection('documents').createIndex({ user: 1, processed: 1 });
      await mongoose.connection.db.collection('transcripts').createIndex({ call: 1, timestamp: 1 });
      await mongoose.connection.db.collection('aisuggestions').createIndex({ call: 1, createdAt: -1 });

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
    }
  }
}

export default new Database();