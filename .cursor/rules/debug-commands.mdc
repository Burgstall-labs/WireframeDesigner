---
description: This tool performs debugging steps for applications
globs: **/*.{js,ts,jsx,tsx,py,html,css,json}
---

# Debug Commands

// Description: This tool performs debugging steps for applications
// Recommended Globs: **/*.{js,ts,jsx,tsx,py,html,css,json}

## Overview
Debug commands provide a streamlined approach to troubleshooting applications by gathering console logs, network errors, and taking screenshots to help identify and fix issues.

## Core Commands

### `/debug` Command
When you type `/debug` in the chat, the AI will automatically:
1. Gather all console logs from the browser
2. Collect any console errors
3. Take a screenshot of the current application state

## Implementation

```javascript
// Example implementation of debug command handler
async function handleDebugCommand() {
  // Gather console logs
  const consoleLogs = await mcp__getConsoleLogs();
  
  // Collect console errors
  const consoleErrors = await mcp__getConsoleErrors();
  
  // Take screenshot
  const screenshot = await mcp__takeScreenshot();
  
  // Analyze and present results
  return {
    consoleLogs,
    consoleErrors,
    screenshot
  };
}
```

## Usage Examples

### Example 1: Debugging a React Application
```
User: My React app is showing a blank screen
AI: Let me help you debug this issue. Type /debug to gather diagnostic information.
User: /debug
AI: [Executes debug command and analyzes results]
    I've found the following issues:
    1. Console error: "TypeError: Cannot read property 'map' of undefined"
    The screenshot shows a blank page with React's error boundary not properly configured.
```

### Example 2: Troubleshooting API Integration
```
User: My API calls are failing and I'm not sure why
AI: Let's investigate. Type /debug while the application is making the API call.
User: /debug
AI: [Executes debug command and analyzes results]
    I've found the following issues:
    1. Console log shows the authorization header is missing
    Based on the screenshot, you need to add proper authentication to your API calls.
```

## Best Practices

### When to Use Debug Commands
- When an application shows unexpected behavior
- When there are no visible error messages
- When troubleshooting network or API issues
- When investigating performance problems
- When helping users who can't easily access developer tools

### Interpreting Debug Results
- Look for patterns in console errors
- Check for failed network requests
- Examine the visual state in screenshots
- Correlate timestamps between different logs
- Identify missing resources or dependencies

### Security Considerations
- Ensure sensitive information is not captured in logs or screenshots
- Be cautious with debugging production environments
- Consider implementing log sanitization for sensitive data
- Use secure channels when sharing debug information

## Supported Environments
- Web browsers (Chrome, Firefox, Safari, Edge)
- React, Angular, Vue applications
- Node.js backend services
- Python applications with proper logging
- Mobile web applications

## Additional Commands

### `/debug:console`
Focus specifically on console output:
```
User: /debug:console
AI: [Gathers console logs and errors]
```

### `/debug:visual`
Focus specifically on visual issues:
```
User: /debug:visual
AI: [Takes screenshot and analyzes visual elements]
```

## Resources
- [Browser DevTools Documentation](https://developer.chrome.com/docs/devtools/)
- [React Error Boundaries](https://reactjs.org/docs/error-boundaries.html)
- [JavaScript Debugging Techniques](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Debugging)
- [Python Debugging Tools](https://docs.python.org/3/library/debug.html)