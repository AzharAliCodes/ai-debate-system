# Branding Customization Guide

## 🎨 Make This Project Your Own!

This guide shows you how to customize the branding for your college project.

---

## 📝 **Update Project Name**

### 1. Change "Prepwise" to Your Project Name

**Files to Update:**

#### `frontend/public/index.html`
```html
<title>Your Project Name</title>
<meta name="description" content="Your project description" />
```

#### `frontend/src/pages/Dashboard.jsx` (Line 58-59)
```jsx
<img src="/logo.svg" alt="Your Project Name" className="h-8" />
<h1 className="text-2xl font-bold text-gray-900">Your Project Name</h1>
```

#### Similar changes in:
- `CreateInterview.jsx`
- `InterviewPage.jsx`
- `FeedbackPage.jsx`
- `SignIn.jsx`
- `SignUp.jsx`

---

## 🎨 **Create Your Own Logo**

### Option 1: Use an Online Logo Maker (Easy)

**Free Logo Generators:**
1. **Canva** - https://www.canva.com/create/logos/
2. **LogoMakr** - https://logomakr.com/
3. **Hatchful** - https://www.shopify.com/tools/logo-maker

**Steps:**
1. Create your logo (recommended size: 200x50px or similar)
2. Download as SVG or PNG
3. Replace `/app/frontend/public/logo.svg` with your file

### Option 2: Simple Text Logo (Quick)

Replace the logo with just text:

**In all page files**, replace:
```jsx
<img src="/logo.svg" alt="Prepwise" className="h-8" />
<h1 className="text-2xl font-bold text-gray-900">Prepwise</h1>
```

With:
```jsx
<h1 className="text-3xl font-bold text-indigo-600">
  🎤 Your Project Name
</h1>
```

### Option 3: Use Your College Logo

1. Get your college logo (SVG or PNG)
2. Save it as `/app/frontend/public/college-logo.svg`
3. Update the image src in all pages:
```jsx
<img src="/college-logo.svg" alt="Your College" className="h-12" />
```

---

## 🎨 **Change Color Scheme**

### Update Theme Colors

Edit `frontend/src/index.css` or `App.css`:

```css
/* Change primary color from indigo to your choice */
.bg-indigo-600 { background-color: #your-color; }
.text-indigo-600 { color: #your-color; }
.border-indigo-600 { border-color: #your-color; }

/* Or use Tailwind's color system */
/* Just replace "indigo" with: blue, green, purple, red, etc. */
```

**Popular Color Schemes for Interview Apps:**
- **Professional Blue:** `blue-600` (#2563EB)
- **Success Green:** `green-600` (#16A34A)
- **Corporate Purple:** `purple-600` (#9333EA)
- **Modern Teal:** `teal-600` (#0D9488)

---

## 📄 **Add Your Information**

### Create an About/Info Section

**Create `frontend/src/pages/About.jsx`:**

```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button onClick={() => navigate('/')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-6">About This Project</h1>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">Project Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Project Title:</p>
                  <p>AI-Powered Mock Interview Platform</p>
                </div>
                <div>
                  <p className="font-semibold">Academic Year:</p>
                  <p>2024-2025</p>
                </div>
                <div>
                  <p className="font-semibold">Course:</p>
                  <p>Your Course Name</p>
                </div>
                <div>
                  <p className="font-semibold">Semester:</p>
                  <p>Your Semester</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Developed By</h2>
              <div className="space-y-2">
                <p><strong>Name:</strong> Your Name</p>
                <p><strong>Roll Number:</strong> Your Roll No</p>
                <p><strong>College:</strong> Your College Name</p>
                <p><strong>Department:</strong> Your Department</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Guided By</h2>
              <p><strong>Faculty Guide:</strong> Professor Name</p>
              <p><strong>Department:</strong> Computer Science / IT</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Technologies Used</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Frontend: React.js, TailwindCSS</li>
                <li>Backend: FastAPI (Python)</li>
                <li>Database: MongoDB</li>
                <li>AI: Google Gemini, VAPI Voice AI</li>
                <li>Authentication: JWT Tokens</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Abstract</h2>
              <p className="text-gray-700 leading-relaxed">
                This project is an AI-powered web application designed to help users 
                prepare for job interviews. It uses artificial intelligence to generate 
                custom interview questions, conducts voice-based mock interviews, and 
                provides detailed feedback on performance. The system aims to improve 
                interview skills through practice and personalized feedback.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;
```

**Add Route in `App.js`:**
```jsx
import About from '@/pages/About';

// Inside <Routes>
<Route path="/about" element={<About />} />
```

**Add Link in Dashboard:**
```jsx
<Button onClick={() => navigate('/about')} variant="outline">
  About Project
</Button>
```

---

## 🏫 **College Branding**

### Add College Footer

Create `frontend/src/components/Footer.jsx`:

```jsx
const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-sm">
          © 2024-2025 | Your College Name | Department of Computer Science
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Final Year Project - AI Mock Interview Platform
        </p>
      </div>
    </footer>
  );
};

export default Footer;
```

Add to all pages:
```jsx
import Footer from '@/components/Footer';

// At the end of your page component
<Footer />
```

---

## 📱 **Favicon (Browser Tab Icon)**

### Create Custom Favicon

1. **Create Icon:** Use Canva or any icon maker
2. **Generate Favicon:** https://favicon.io/
3. **Replace Files:**
   - Put `favicon.ico` in `frontend/public/`
   - Update `frontend/public/index.html`:
   ```html
   <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
   ```

---

## 🎯 **Remove All Emergent References**

### Files to Check

Search and replace "Emergent" with your project name in:

```bash
# Search for any remaining Emergent references
grep -r "emergent" frontend/src/ -i
grep -r "emergent" backend/ -i
```

**Key Places:**
- Logo files
- Documentation (README.md)
- Environment variable names
- Comments in code
- Package names

---

## ✅ **Customization Checklist**

- [ ] Replace logo with your own design
- [ ] Change "Prepwise" to your project name everywhere
- [ ] Update colors to match your preference
- [ ] Add About page with your information
- [ ] Add college footer to all pages
- [ ] Create custom favicon
- [ ] Remove any Emergent branding
- [ ] Update README.md with your details
- [ ] Add screenshots to documentation
- [ ] Verify all pages have consistent branding

---

## 🎨 **Quick Brand Update Commands**

### Find and Replace All "Prepwise"

**Mac/Linux:**
```bash
cd frontend/src
find . -type f -name "*.jsx" -o -name "*.js" | xargs sed -i 's/Prepwise/YourProjectName/g'
```

**Windows (PowerShell):**
```powershell
Get-ChildItem -Path . -Include *.jsx,*.js -Recurse | 
  ForEach-Object { 
    (Get-Content $_.FullName) -replace 'Prepwise', 'YourProjectName' | 
    Set-Content $_.FullName 
  }
```

---

## 💡 **Design Tips**

1. **Keep it Professional:** Use business-appropriate colors
2. **Make it Readable:** Ensure good contrast
3. **Be Consistent:** Use same colors/fonts throughout
4. **Add College Identity:** But don't overdo it
5. **Test Responsiveness:** Check on mobile too

---

## 🎓 **For College Submission**

**What to Customize:**
- ✅ Logo and branding
- ✅ Color scheme
- ✅ About/Info page with your details
- ✅ Footer with college name
- ✅ README with your information
- ✅ Screenshots in documentation

**What NOT to Change:**
- ❌ Core functionality
- ❌ Database structure
- ❌ API architecture
- ❌ Security implementations

This ensures your project works while being uniquely yours!

---

**Need more customization help? Just ask!** 🎨
