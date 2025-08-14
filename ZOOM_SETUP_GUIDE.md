# Zoom SDK Setup Guide

## Quick Fix for "Failed to load Zoom Web SDK"

### 1. Get Zoom SDK Credentials

1. **Visit Zoom Marketplace**: Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. **Sign in** with your Zoom account
3. **Create a new app**: Click "Develop" → "Build App"
4. **Choose SDK App**: Select "SDK App" as the app type
5. **Fill in app details**:
   - App name: "AI Sales Assistant"
   - App type: "Meeting SDK"
   - User type: "Account"
6. **Get your credentials**:
   - Copy the "SDK Key" (Client ID)
   - Copy the "SDK Secret" (Client Secret)

### 2. Update Environment Variables

Create or update your `.env` file in the `server/` directory:

```env
# Zoom SDK Configuration
ZOOM_SDK_KEY=your-sdk-key-here
ZOOM_SDK_SECRET=your-sdk-secret-here

# Frontend Zoom SDK Key (for Vite)
VITE_ZOOM_SDK_KEY=your-sdk-key-here

# Other required variables
MONGODB_URI=mongodb://localhost:27017/ai-sales-assistant
JWT_SECRET=your-super-secret-jwt-key-here
OPENAI_API_KEY=sk-your-openai-api-key-here
DEEPGRAM_API_KEY=your-deepgram-api-key-here
```

### 3. Configure Zoom App Settings

In your Zoom Marketplace app:

1. **Go to "App Credentials"**
2. **Add redirect URL**: `http://localhost:5173/zoom-oauth-callback`
3. **Go to "Meeting SDK"**
4. **Enable "Meeting"** feature
5. **Add domains**:
   - `localhost`
   - `127.0.0.1`
   - Your production domain (if any)

### 4. Restart the Application

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### 5. Test the Integration

1. Go to the Call page
2. Select Zoom integration
3. Check browser console for success messages:
   - ✅ React dependency loaded
   - ✅ React-DOM dependency loaded
   - ✅ Redux dependency loaded
   - ✅ Lodash dependency loaded
   - ✅ Zoom Web SDK loaded successfully
   - ✅ Zoom SDK initialized successfully

## Troubleshooting

### Common Issues

1. **"Zoom SDK Key not configured"**
   - Make sure `VITE_ZOOM_SDK_KEY` is set in your `.env` file
   - Restart the development server after adding the variable

2. **"Failed to load Zoom SDK dependencies"**
   - Check your internet connection
   - Try refreshing the page
   - Check if Zoom's CDN is accessible

3. **"Failed to initialize Zoom SDK"**
   - Verify your SDK key and secret are correct
   - Check that your Zoom app is properly configured
   - Ensure the redirect URL is set correctly

4. **CORS errors**
   - Make sure your domain is added to the Zoom app's allowed domains
   - Check that the redirect URL matches exactly

### Debug Steps

1. **Check environment variables**:
   ```bash
   # In your browser console
   console.log(import.meta.env.VITE_ZOOM_SDK_KEY);
   ```

2. **Check network requests**:
   - Open browser DevTools → Network tab
   - Look for failed requests to `source.zoom.us`

3. **Check console logs**:
   - Look for the detailed loading messages
   - Any error messages will help identify the issue

### Alternative Setup (If SDK App doesn't work)

If you're having trouble with the SDK App, you can also use a Meeting SDK app:

1. **Create "Meeting SDK" app** instead of "SDK App"
2. **Use the same credentials** (Client ID and Client Secret)
3. **Configure the same redirect URL**
4. **Enable the Meeting feature**

## Production Setup

For production deployment:

1. **Update redirect URL** to your production domain
2. **Add production domain** to allowed domains in Zoom app
3. **Set environment variables** on your production server
4. **Test thoroughly** before going live

## Support

If you're still having issues:

1. Check the browser console for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure your Zoom app is properly configured
4. Try creating a new Zoom app with different settings
