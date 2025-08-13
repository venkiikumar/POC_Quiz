# Azure Deployment Checklist & Instructions

## **Problem Diagnosis**
Your Azure App Service deployment is failing because:
1. ❌ The application tries to connect to `localhost:3000` (your local machine)
2. ❌ Uses local SQLite database that Azure can't access
3. ❌ Server entry point wasn't configured for Azure

## **Solution Summary**
✅ Created `server-azure.js` - Azure-compatible server
✅ Updated `package.json` to use Azure server
✅ Modified frontend to auto-detect Azure vs local environment
✅ Added proper Azure configuration files
✅ Fixed database initialization

## **Step-by-Step Azure Deployment**

### **Step 1: Prepare Files for Deployment**
```bash
# In your project directory, ensure these files exist:
- server-azure.js          # ✅ Created
- package.json             # ✅ Updated (main: "server-azure.js")
- web.config               # ✅ Created (Azure configuration)
- .deployment              # ✅ Updated
- .env.azure              # ✅ Created (environment variables)
- quiz_app.db             # ✅ Database with sample data
```

### **Step 2: Deploy to Azure App Service**

#### **Option A: Using Visual Studio Code**
1. Install "Azure App Service" extension
2. Right-click project folder → "Deploy to Web App"
3. Select your Azure subscription
4. Select your existing app service: `cts-vibeappau21214-2`

#### **Option B: Using Azure CLI**
```bash
# Login to Azure
az login

# Deploy using zip
az webapp deployment source config-zip \
  --resource-group your-resource-group \
  --name cts-vibeappau21214-2 \
  --src deployment.zip
```

#### **Option C: Using Git Deployment**
```bash
# Add Azure Git remote (get URL from Azure portal)
git remote add azure <your-azure-git-url>

# Deploy
git add .
git commit -m "Azure deployment configuration"
git push azure main
```

### **Step 3: Configure Azure Environment Variables**
In Azure Portal → App Service → Configuration → Application settings:

```
NODE_ENV=production
PORT=8080
DATABASE_URL=file:./quiz_app.db
WEBSITE_NODE_DEFAULT_VERSION=18.17.0
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

### **Step 4: Verify Deployment**

1. **Check URL**: https://cts-vibeappau21214-2.azurewebsites.net/
2. **Test API**: https://cts-vibeappau21214-2.azurewebsites.net/api/test
3. **Health Check**: https://cts-vibeappau21214-2.azurewebsites.net/health

### **Step 5: Troubleshooting**

#### **If you see "Database server is not running":**
1. Wait 2-3 minutes for Azure to start the application
2. Check Azure Portal → App Service → Log stream for errors
3. Refresh the webpage

#### **If application won't start:**
1. Check Azure Portal → App Service → Configuration
2. Ensure `WEBSITE_NODE_DEFAULT_VERSION=18.17.0`
3. Check Log stream for detailed error messages

#### **Common Issues & Fixes:**

**Issue**: "Application Error" page
**Fix**: Check if `web.config` exists and `package.json` has correct start script

**Issue**: "Cannot find module" errors
**Fix**: Ensure `package.json` dependencies are correct and `npm install` runs during deployment

**Issue**: Database errors
**Fix**: Ensure `quiz_app.db` file is included in deployment

## **File Changes Made**

### **server-azure.js** (NEW)
- Azure-compatible Express server
- Correct port handling (`process.env.PORT`)
- Database initialization
- CORS configuration for production

### **script.js** (UPDATED)
- Auto-detects Azure vs local environment
- Uses `window.location.origin` for Azure API calls
- Better error messages for Azure

### **package.json** (UPDATED)
```json
{
  "main": "server-azure.js",
  "scripts": {
    "start": "node server-azure.js"
  }
}
```

### **web.config** (NEW)
- IIS configuration for Azure App Service
- Routes all requests to `server-azure.js`

## **Testing Locally**
```bash
# Test Azure configuration locally
set PORT=8081
node server-azure.js

# Test in browser
http://localhost:8081
```

## **Expected Result**
After deployment, your application will:
✅ Work from any machine/location
✅ Not require local server running
✅ Show applications dropdown populated with data
✅ Allow taking quizzes and saving results
✅ Work on mobile devices

## **URLs After Deployment**
- **Main App**: https://cts-vibeappau21214-2.azurewebsites.net/
- **API Test**: https://cts-vibeappau21214-2.azurewebsites.net/api/test
- **Health Check**: https://cts-vibeappau21214-2.azurewebsites.net/health
- **Applications**: https://cts-vibeappau21214-2.azurewebsites.net/api/applications

The error "Database server is not running" should no longer appear once deployed correctly!
