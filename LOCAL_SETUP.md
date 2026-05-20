# Prepwise - Local Setup Guide for College Project

## 🎓 **Complete Local Installation Guide**

This guide will help you set up the AI Mock Interview Platform on your local machine for your college project.

---

## 📋 **Prerequisites**

Install these on your local machine:

1. **Python 3.8+** - [Download](https://www.python.org/downloads/)
2. **Node.js 16+** - [Download](https://nodejs.org/)
3. **MongoDB** - [Download](https://www.mongodb.com/try/download/community)
4. **Git** (optional) - [Download](https://git-scm.com/)

---

## 🚀 **Step-by-Step Local Setup**

### **Step 1: Download the Project**

**Option A: From Emergent**
- Click "Save to GitHub" or "Download" button
- Download the ZIP file
- Extract to your desired location

**Option B: If you have the code already**
- Copy the project folder to your local machine

---

### **Step 2: Install MongoDB Locally**

#### **Windows:**
1. Download MongoDB Community Server
2. Install with default settings
3. MongoDB should start automatically
4. Default connection: `mongodb://localhost:27017`

#### **Mac:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### **Linux (Ubuntu/Debian):**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**Verify MongoDB is running:**
```bash
# Check if MongoDB is running
mongosh
# or
mongo
# Type 'exit' to close
```

---

### **Step 3: Backend Setup (FastAPI)**

Open terminal/command prompt in project folder:

```bash
# Navigate to backend folder
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### **Configure Backend Environment Variables**

Create/Edit `backend/.env` file:

```env
# MongoDB Configuration (Local)
MONGO_URL=mongodb://localhost:27017
DB_NAME=prepwise_local_db
CORS_ORIGINS=http://localhost:3000

# API Keys (Get your own for free)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
VAPI_PUBLIC_KEY=your_vapi_public_key_here
VAPI_ASSISTANT_ID=your_vapi_assistant_id_here

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-this-to-something-random
JWT_ALGORITHM=HS256
JWT_EXPIRATION_DAYS=7
```

**How to Get Free API Keys:**

1. **Google Gemini API Key** (FREE):
   - Go to: https://ai.google.dev/
   - Click "Get API Key"
   - Sign in with Google
   - Create new API key
   - Copy and paste in `.env`

2. **VAPI** (Optional - for voice interviews):
   - Go to: https://vapi.ai
   - Sign up for free account
   - Get Public Key and Assistant ID
   - Add to `.env`

#### **Start Backend Server**

```bash
# Make sure you're in backend folder with venv activated
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**Backend should now be running at:** `http://localhost:8001`

---

### **Step 4: Frontend Setup (React)**

Open **NEW terminal/command prompt** (keep backend running):

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies (using npm or yarn)
npm install
# OR
yarn install
```

#### **Configure Frontend Environment Variables**

Create/Edit `frontend/.env` file:

```env
# Backend URL (Local)
REACT_APP_BACKEND_URL=http://localhost:8001

# For local development
WDS_SOCKET_PORT=3000
```

#### **Start Frontend Development Server**

```bash
# In frontend folder
npm start
# OR
yarn start
```

**Frontend should now be running at:** `http://localhost:3000`

---

## 🎉 **Access Your Application**

1. Open browser and go to: `http://localhost:3000`
2. You should see the Prepwise login page!
3. Click "Sign Up" to create your first account

---

## 🧪 **Testing the Application**

### **Create Test Account:**
```
Email: test@college.com
Password: Test123456
Name: Test Student
```

### **Test Features:**
1. ✅ Sign Up / Sign In
2. ✅ Create Interview (requires Gemini API key)
3. ✅ Browse Interviews
4. ✅ Voice Interview (requires VAPI setup)
5. ✅ View Feedback

---

## 📁 **Project Structure**

```
prepwise/
├── backend/
│   ├── server.py              # Main FastAPI application
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Backend configuration
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components
│   │   ├── utils/            # Utility functions
│   │   └── App.js            # Main app component
│   ├── public/               # Static assets
│   ├── package.json          # Node dependencies
│   └── .env                  # Frontend configuration
└── README.md                 # Project documentation
```

---

## 🔧 **Common Issues & Solutions**

### **Issue 1: MongoDB Connection Error**
```
Error: Cannot connect to MongoDB
```
**Solution:**
- Make sure MongoDB is running: `mongosh` or `mongo`
- Check MongoDB is on port 27017
- Verify MONGO_URL in backend/.env

### **Issue 2: Backend Port Already in Use**
```
Error: Address already in use
```
**Solution:**
- Change port in command: `uvicorn server:app --reload --port 8002`
- Update REACT_APP_BACKEND_URL in frontend/.env to `http://localhost:8002`

### **Issue 3: Frontend Won't Start**
```
Error: Cannot find module
```
**Solution:**
- Delete node_modules: `rm -rf node_modules`
- Reinstall: `npm install` or `yarn install`

### **Issue 4: CORS Errors**
```
Error: CORS policy blocked
```
**Solution:**
- Make sure backend CORS_ORIGINS includes `http://localhost:3000`
- Restart backend server

### **Issue 5: Gemini API Quota Exceeded**
```
Error: 429 Quota exceeded
```
**Solution:**
- Wait for quota reset (daily limit for free tier)
- Or get a new API key
- Or add billing to your Google AI account

---

## 🎨 **Customization for College Project**

### **1. Change Project Name/Branding:**
Edit these files:
- `frontend/public/index.html` - Change title
- `frontend/src/components/` - Update logo/branding
- `README.md` - Update project description

### **2. Add Your College Info:**
Create `frontend/src/pages/About.jsx`:
```jsx
const About = () => {
  return (
    <div className="p-8">
      <h1>About This Project</h1>
      <p>Created by: Your Name</p>
      <p>College: Your College Name</p>
      <p>Course: Your Course</p>
      <p>Year: 2024-2025</p>
    </div>
  );
};
```

### **3. Add New Features:**
- Interview history charts
- Performance analytics
- More interview types
- Export feedback as PDF

---

## 📦 **Deployment (Optional)**

### **For College Submission:**

**Option 1: Run Locally During Demo**
- Just follow this guide
- Demo on your laptop

**Option 2: Deploy for Free**

**Backend:**
- [Railway.app](https://railway.app) - Free tier
- [Render.com](https://render.com) - Free tier
- [Heroku](https://heroku.com) - Free tier

**Frontend:**
- [Vercel](https://vercel.com) - Free tier
- [Netlify](https://netlify.com) - Free tier

**Database:**
- [MongoDB Atlas](https://mongodb.com/cloud/atlas) - Free tier (512MB)

---

## 📚 **Documentation for College Report**

### **Technology Stack:**
- **Frontend:** React.js, TailwindCSS, Axios
- **Backend:** FastAPI (Python), Motor (async MongoDB)
- **Database:** MongoDB
- **AI Integration:** Google Gemini, VAPI Voice AI
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time Communication:** WebSockets (VAPI)

### **Key Features:**
1. User Authentication System
2. AI-Powered Question Generation
3. Voice Interview Integration
4. Real-time Feedback Analysis
5. Interview History Management
6. Responsive UI/UX

### **Architecture:**
- **Pattern:** RESTful API Architecture
- **Database:** NoSQL (Document-based)
- **Authentication:** Token-based
- **API Structure:** Modular with route separation

---

## 🆘 **Need Help?**

### **Common Questions:**

**Q: Do I need to pay for anything?**
A: No! Everything can be run with free tiers:
- MongoDB: Free locally or MongoDB Atlas (512MB free)
- Gemini API: Free tier (60 requests/minute)
- VAPI: Free trial available

**Q: Can I run this without VAPI?**
A: Yes! The voice feature is optional. The app works without it for:
- User authentication
- Interview creation
- Text-based Q&A
- Feedback viewing

**Q: How to create a demo video?**
A: Use OBS Studio (free) to record:
1. Sign up flow
2. Creating interview
3. Viewing questions
4. Getting feedback
5. Dashboard overview

**Q: What to include in college report?**
- Project overview
- Technology stack explanation
- System architecture diagram
- ER diagram for database
- Screenshots of features
- Code snippets of key functionality
- Future enhancements

---

## 🎓 **College Project Checklist**

- [ ] Install all prerequisites
- [ ] Set up MongoDB locally
- [ ] Configure backend .env
- [ ] Start backend server successfully
- [ ] Configure frontend .env
- [ ] Start frontend successfully
- [ ] Create test account
- [ ] Test all features
- [ ] Get Gemini API key (free)
- [ ] Take screenshots for report
- [ ] Record demo video
- [ ] Write project documentation
- [ ] Prepare presentation slides
- [ ] Test on different browsers
- [ ] Add college branding/info

---

## 📝 **Quick Start Commands (Summary)**

```bash
# Terminal 1 - Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Terminal 2 - Frontend  
cd frontend
npm install
npm start

# Terminal 3 - MongoDB (if not running as service)
mongod
```

---

## 🎉 **You're All Set!**

Your AI Mock Interview Platform is now running locally and ready for your college project!

**Default URLs:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8001
- MongoDB: mongodb://localhost:27017

**Good luck with your college project!** 🚀

---

## 📞 **Project Details for Report**

**Project Name:** Prepwise - AI Mock Interview Platform

**Description:** A full-stack web application that helps users prepare for job interviews through AI-powered question generation, voice-based mock interviews, and detailed performance feedback.

**Key Technologies:**
- Frontend: React.js 19, TailwindCSS, React Router
- Backend: FastAPI, Python 3.8+
- Database: MongoDB (NoSQL)
- AI Integration: Google Gemini AI, VAPI Voice AI
- Authentication: JWT-based token authentication

**Features:**
1. Secure user authentication
2. AI-generated interview questions
3. Real-time voice interviews
4. Performance feedback and scoring
5. Interview history tracking
6. Responsive design

**Target Users:** Job seekers, students, professionals preparing for interviews

**Future Enhancements:**
- Video interview support
- Multiple language support
- Interview scheduling
- Performance analytics dashboard
- Company-specific interview prep
- Mock technical coding interviews
