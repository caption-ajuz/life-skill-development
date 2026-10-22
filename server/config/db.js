import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 4000;

async function connectDB(retries = MAX_RETRIES) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB Atlas successfully.');
  } catch (err) {
    if (retries > 0) {
      console.warn(`⚠️ MongoDB connection attempt failed: ${err.message}. Retrying in ${RETRY_DELAY_MS / 1000}s... (${retries} attempts left)`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return connectDB(retries - 1);
    }
    console.error('❌ MongoDB Atlas connection failed after all retries:', err.message);
    console.error('👉 TIP: Ensure your current IP address is whitelisted in MongoDB Atlas Network Access (or set to 0.0.0.0/0 for anywhere).');
    process.exit(1);
  }
}

mongoose.connection.on('connected', () => {
  console.log('📡 MongoDB Mongoose connection established.');
});

mongoose.connection.on('error', (err) => {
  console.error('⚠️ MongoDB runtime error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected.');
});

export default connectDB;
