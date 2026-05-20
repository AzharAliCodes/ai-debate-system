# Prepwise - AI Mock Interview Platform

🎯 **An AI-powered platform for practicing job interviews with voice agents and receiving instant feedback**

## 🌟 Features

- 🔐 **Secure Authentication** - JWT-based user registration and login
- 🤖 **AI Question Generation** - Custom interview questions using Google Gemini
- 🎤 **Voice Interviews** - Real-time conversations with VAPI AI voice agents
- 📊 **Instant Feedback** - Detailed performance analysis and scoring
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 💾 **Interview History** - Track all your practice sessions

## 🚀 Quick Start

See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for complete installation instructions.

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd prepwise
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Frontend Setup**
```bash
cd frontend
npm install
```

4. **Configure Environment**
- Copy `.env.example` to `.env` in both backend and frontend
- Add your API keys (see LOCAL_SETUP.md)

5. **Start Services**
```bash
# Terminal 1 - Backend
cd backend
uvicorn server:app --reload --port 8001

# Terminal 2 - Frontend
cd frontend
npm start
```

6. **Access Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001

## 📁 Project Structure

```
prepwise/
├── backend/
│   ├── server.py              # FastAPI application
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Backend configuration
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components
│   │   ├── utils/            # Utility functions
│   │   └── App.js            # Main app
│   ├── package.json          # Dependencies
│   └── .env                  # Frontend configuration
└── README.md                 # This file
```

## 🛠️ Tech Stack

- **Frontend:** React 19, TailwindCSS, React Router, Axios
- **Backend:** FastAPI, Python, Motor (MongoDB async driver)
- **Database:** MongoDB
- **AI:** Google Gemini AI, VAPI Voice AI
- **Authentication:** JWT tokens with bcrypt password hashing

## 🔑 API Keys

Get free API keys from:

1. **Google Gemini** (Required for AI features)
   - Visit: https://ai.google.dev/
   - Free tier: 60 requests/minute

2. **VAPI** (Optional for voice interviews)
   - Visit: https://vapi.ai
   - Free trial available

## 📚 API Documentation

Once running, visit: http://localhost:8001/docs for interactive API documentation (FastAPI Swagger UI)

## 🧪 Testing

### Create Test Account
```
Email: test@example.com
Password: Test123456
```

### Test Features
1. User Registration & Login
2. Create Mock Interview
3. Generate AI Questions
4. Start Voice Interview
5. Receive Feedback

## 🎓 For College Projects

This project is perfect for:
- Final year projects
- Web development courses
- AI/ML integration projects
- Full-stack development demonstrations

See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for detailed documentation suitable for college reports.

## 📖 Documentation

- [Local Setup Guide](./LOCAL_SETUP.md) - Complete installation guide
- [Test Credentials](./memory/test_credentials.md) - Test account information

## 🐛 Troubleshooting

See [LOCAL_SETUP.md](./LOCAL_SETUP.md) "Common Issues & Solutions" section

## 🤝 Contributing

This is a college/educational project. Feel free to:
- Add new features
- Improve UI/UX
- Fix bugs
- Enhance documentation

## 📝 License

MIT License - Free to use for educational purposes

## 👨‍💻 Created By

[Your Name]
[Your College Name]
[Your Course/Year]

## 🌟 Features in Detail

### Authentication
- Secure password hashing with bcrypt
- JWT token-based sessions
- Protected routes

### Interview Generation
- AI-powered question creation
- Customizable by role, level, and tech stack
- 3-15 questions per interview

### Voice Interviews
- Real-time voice conversations
- Professional AI interviewer
- Live transcript display
- Natural conversation flow

### Feedback System
- Overall performance score (0-100)
- Category-wise breakdown:
  - Communication Skills
  - Technical Knowledge
  - Problem Solving
  - Cultural Fit
  - Confidence and Clarity
- Detailed strengths and improvement areas
- Actionable recommendations

## 🚀 Future Enhancements

- [ ] Video interview support
- [ ] Multiple languages
- [ ] Company-specific prep
- [ ] Coding interview practice
- [ ] Performance analytics dashboard
- [ ] Interview scheduling
- [ ] PDF report export
- [ ] Social sharing

## 📊 Database Schema

### Users
- id, name, email, password_hash, createdAt

### Interviews
- id, userId, role, level, type, techstack[], questions[], finalized, coverImage, createdAt

### Feedback
- id, interviewId, userId, totalScore, categoryScores[], strengths[], areasForImprovement[], finalAssessment, createdAt

---

**Made with ❤️ for learning and innovation**


🎯 **An AI-powered platform to practice job interviews with voice agents and receive instant feedback**

## 🚀 Features

✅ **User Authentication** - Secure JWT-based email/password authentication  
✅ **AI-Powered Interview Questions** - Generate custom interview questions using Google Gemini based on role, level, and tech stack  
✅ **Voice Interviews** - Conduct real-time voice interviews with VAPI AI agents  
✅ **Instant AI Feedback** - Get detailed performance analysis with scores, strengths, and areas for improvement  
✅ **Interview Dashboard** - View and manage all your interviews in one place  
✅ **Tech Stack Recognition** - Display relevant technology icons for your interview  

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database for flexible data storage
- **Google Gemini 2.0** - AI model for generating questions and feedback
- **JWT** - Secure authentication tokens
- **Bcrypt** - Password hashing

### Frontend
- **React 19** - Modern React with hooks
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality UI components
- **VAPI AI** - Voice conversation interface

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB
- VAPI API Key
- Google Gemini API Key

## 🔧 Installation

### Backend Setup

```bash
cd /app/backend
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd /app/frontend
yarn install
```

## 🔑 Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=prepwise_db
GOOGLE_GEMINI_API_KEY=your_gemini_key
VAPI_API_KEY=your_vapi_key
JWT_SECRET=your_secret_key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_DAYS=7
CORS_ORIGINS=*
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=your_backend_url
```

## 🚀 Running the Application

### Using Supervisor (Recommended)
```bash
sudo supervisorctl restart all
```

### Manual Start

**Backend:**
```bash
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001
```

**Frontend:**
```bash
cd /app/frontend
yarn start
```

## 📱 Usage

1. **Sign Up/Sign In**
   - Create an account or log in with existing credentials
   - Test credentials: test@prepwise.com / Test123456

2. **Create Interview**
   - Click "Create New Interview" on the dashboard
   - Fill in job role, experience level, interview type, tech stack, and number of questions
   - AI will generate custom interview questions

3. **Conduct Interview**
   - Click on an interview card to start
   - Click "Start Interview" to begin voice conversation
   - Answer questions naturally
   - Click "End Interview" when done

4. **View Feedback**
   - Automatic redirect to feedback page after interview
   - View overall score, category breakdowns, strengths, and areas for improvement
   - Retake interview to practice more

## 🏗️ Project Structure

```
/app/
├── backend/
│   ├── server.py              # Main FastAPI application
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Agent.jsx          # VAPI voice agent
│   │   │   ├── AuthForm.jsx       # Authentication form
│   │   │   ├── InterviewCard.jsx  # Interview card component
│   │   │   └── DisplayTechIcons.jsx
│   │   ├── pages/            # Page components
│   │   │   ├── SignIn.jsx
│   │   │   ├── SignUp.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreateInterview.jsx
│   │   │   ├── InterviewPage.jsx
│   │   │   └── FeedbackPage.jsx
│   │   ├── utils/            # Utility functions
│   │   │   ├── api.js          # Axios instance
│   │   │   ├── auth.js         # Auth helpers
│   │   │   └── helpers.js      # General helpers
│   │   ├── App.js            # Main app component
│   │   └── App.css           # Global styles
│   ├── package.json
│   └── .env
└── public/                   # Static assets
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Interviews
- `POST /api/interviews/generate` - Generate interview with AI questions
- `GET /api/interviews/user/{user_id}` - Get user's interviews
- `GET /api/interviews/latest` - Get latest public interviews
- `GET /api/interviews/{id}` - Get specific interview

### Feedback
- `POST /api/feedback/create` - Generate AI feedback from interview transcript
- `GET /api/feedback/interview/{interview_id}` - Get feedback for interview

### VAPI
- `POST /api/vapi/assistant` - Get VAPI assistant configuration

## 🤖 AI Integration

### Google Gemini
- **Model**: gemini-2.0-flash-exp
- **Use Cases**:
  - Generate interview questions based on role and tech stack
  - Analyze interview transcripts and provide detailed feedback
  - Score candidates across multiple categories

### VAPI AI
- **Voice Provider**: ElevenLabs (Sarah voice)
- **Transcriber**: Deepgram Nova-2
- **Model**: OpenAI GPT-4
- **Features**:
  - Real-time voice conversations
  - Natural language understanding
  - Professional interview conduct

## 🎨 UI Components

- Built with **shadcn/ui** for consistent, accessible design
- **Radix UI** primitives for robust component foundations
- **Tailwind CSS** for responsive, modern styling
- **Lucide React** icons

## 🔐 Security

- ✅ Password hashing with Bcrypt
- ✅ JWT token-based authentication
- ✅ Protected API routes
- ✅ CORS configuration
- ✅ Input validation
- ✅ MongoDB ObjectId replaced with UUIDs for better security

## 📊 Database Schema

### Users Collection
```javascript
{
  id: "uuid",
  name: "string",
  email: "string",
  password: "hashed_string",
  createdAt: "ISO datetime"
}
```

### Interviews Collection
```javascript
{
  id: "uuid",
  userId: "uuid",
  role: "string",
  level: "string",
  type: "string",
  techstack: ["string"],
  questions: ["string"],
  finalized: boolean,
  coverImage: "string",
  createdAt: "ISO datetime"
}
```

### Feedback Collection
```javascript
{
  id: "uuid",
  interviewId: "uuid",
  userId: "uuid",
  totalScore: number,
  categoryScores: [
    {
      name: "string",
      score: number,
      comment: "string"
    }
  ],
  strengths: ["string"],
  areasForImprovement: ["string"],
  finalAssessment: "string",
  createdAt: "ISO datetime"
}
```

## 🧪 Testing

### Test User Credentials
- **Email**: test@prepwise.com
- **Password**: Test123456

### Testing Authentication
```bash
# Sign Up
curl -X POST http://localhost:8001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@prepwise.com","password":"Test123456"}'

# Sign In
curl -X POST http://localhost:8001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@prepwise.com","password":"Test123456"}'
```

## 🐛 Common Issues

### Backend not starting
- Check MongoDB is running: `sudo supervisorctl status mongodb`
- Check backend logs: `tail -n 50 /var/log/supervisor/backend.*.log`
- Verify environment variables in `/app/backend/.env`

### Frontend not loading
- Check frontend logs: `tail -n 50 /var/log/supervisor/frontend.*.log`
- Verify REACT_APP_BACKEND_URL in `/app/frontend/.env`
- Clear browser cache

### VAPI not connecting
- Verify VAPI API key in backend .env
- Check browser console for errors
- Ensure microphone permissions are granted

## 🚧 Roadmap

- [ ] Add more interview types (System Design, Coding)
- [ ] Support multiple languages
- [ ] Interview history and analytics
- [ ] Practice mode without AI feedback
- [ ] Export feedback as PDF
- [ ] Team accounts for companies

## 📄 License

MIT License - Feel free to use this project for learning and development!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Made with ❤️ using FastAPI, React, MongoDB, Google Gemini, and VAPI AI**
