// Debug script to test extension functionality
console.log('🔍 Extension Debug Script Loaded');

// Test 1: Check if extension is loaded
function testExtensionLoaded() {
    console.log('✅ Test 1: Extension scripts are loading');
    return true;
}

// Test 2: Check Chrome extension APIs
function testChromeAPIs() {
    console.log('🔍 Test 2: Checking Chrome APIs...');
    
    if (typeof chrome === 'undefined') {
        console.error('❌ Chrome APIs not available');
        return false;
    }
    
    if (!chrome.runtime) {
        console.error('❌ chrome.runtime not available');
        return false;
    }
    
    if (!chrome.storage) {
        console.error('❌ chrome.storage not available');
        return false;
    }
    
    console.log('✅ Chrome APIs available');
    return true;
}

// Test 3: Check authentication status
async function testAuthentication() {
    console.log('🔍 Test 3: Checking authentication...');
    
    try {
        const result = await chrome.storage.local.get(['authToken', 'userId', 'userEmail']);
        console.log('📦 Storage data:', result);
        
        if (result.authToken) {
            console.log('✅ Auth token found');
            return true;
        } else {
            console.log('⚠️ No auth token found');
            return false;
        }
    } catch (error) {
        console.error('❌ Error checking auth:', error);
        return false;
    }
}

// Test 4: Check server connection
async function testServerConnection() {
    console.log('🔍 Test 4: Testing server connection...');
    
    try {
        const response = await fetch('http://localhost:3002/api/auth/login', {
            method: 'OPTIONS'
        });
        
        console.log('🌐 Server response status:', response.status);
        console.log('✅ Server is reachable');
        return true;
    } catch (error) {
        console.error('❌ Server connection failed:', error);
        return false;
    }
}

// Test 5: Check if content script can create UI
function testUICreation() {
    console.log('🔍 Test 5: Testing UI creation...');
    
    try {
        const testDiv = document.createElement('div');
        testDiv.id = 'ai-sales-test';
        testDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #4CAF50;
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 12px;
        `;
        testDiv.textContent = '✅ AI Sales Extension Loaded';
        
        document.body.appendChild(testDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (document.getElementById('ai-sales-test')) {
                document.body.removeChild(testDiv);
            }
        }, 3000);
        
        console.log('✅ UI creation successful');
        return true;
    } catch (error) {
        console.error('❌ UI creation failed:', error);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Extension Debug Tests...');
    
    const results = {
        extensionLoaded: testExtensionLoaded(),
        chromeAPIs: testChromeAPIs(),
        authentication: await testAuthentication(),
        serverConnection: await testServerConnection(),
        uiCreation: testUICreation()
    };
    
    console.log('📊 Test Results:', results);
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`🎯 Tests Passed: ${passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Extension should be working.');
    } else {
        console.log('⚠️ Some tests failed. Check the issues above.');
    }
    
    return results;
}

// Auto-run tests when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
} else {
    runAllTests();
}
