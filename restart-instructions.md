# How to Fix the Connection Error

The error is occurring because the client application is still trying to connect to port 3002, but the server is running on port 5000. Although we've updated the environment variable in `src/.env`, the client application needs to be restarted to pick up this change.

## Steps to Fix

1. **Stop the current client application** (if it's running)

2. **Restart the client application** to pick up the new environment variable:
   ```
   cd d:\AI SALES
   npm start
   ```

3. **Alternative solution**: If restarting doesn't work, you can also modify the API URL directly in the code:
   
   Open `src/lib/api.ts` and change:
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-sales-unaib.onrender.com/api';
   ```
   
   to:
   ```typescript
   const API_BASE_URL = 'http://localhost:5000/api';
   ```

4. **Verify the server is running** on port 5000:
   ```
   cd d:\AI SALES\server
   npm start
   ```

After following these steps, the connection error should be resolved, and you should be able to sign up successfully.