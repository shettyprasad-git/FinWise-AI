# FinWise AI – Digital Financial Literacy Assistant

A production-ready Flask web application that improves digital financial literacy using live conversational AI powered by **IBM watsonx.ai** (Llama 3.3 70B Instruct, au-syd region).

---

## 🚀 Features

| Page | Route | Description |
|---|---|---|
| **Home** | `/` | Hero banner, quick tools grid, features & benefits sections |
| **AI Chat** | `/chat` | Live IBM watsonx.ai chat — Llama 3.3 70B, typing animation, 10 topic shortcuts |
| **Budget Planner** | `/budget` | Income vs expense analyser with Chart.js donut and personalised suggestions |
| **EMI Calculator** | `/emi` | Loan EMI, total interest, total payment + 12-month amortisation table |
| **Scam Awareness** | `/scam` | 6 educational cards: OTP, QR Code, Fake Loans, Phishing, Investment Fraud, Customer Care |
| **About** | `/about` | IBM watsonx Orchestrate, Cloud Lite & Granite technology overview |
| **Contact** | `/contact` | Contact form with client-side + server-side validation and flash messages |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11+, Flask 3.0.3, Werkzeug 3.0.3, python-dotenv, requests 2.32, gunicorn 22 |
| **Frontend** | HTML5, CSS3, Bootstrap 5.3.3, Bootstrap Icons 1.11, Chart.js 4.4.3, IBM Plex Sans |
| **AI (Live)** | `meta-llama/llama-3-3-70b-instruct` via IBM watsonx.ai (au-syd), IAM Bearer auth |
| **IBM Services** | IBM watsonx Orchestrate, IBM Cloud Lite, IBM IAM |
| **Deployment** | Gunicorn, IBM Cloud Foundry / any WSGI host |

---

## 📁 Project Structure

```
FinWise AI/
├── app.py                    # Flask app + IBM watsonx.ai integration + 4 API routes
├── requirements.txt          # Python dependencies
├── .env                      # Live credentials (gitignored — see .env variables below)
├── README.md
├── static/
│   ├── css/
│   │   └── style.css         # IBM design system, animations, responsive layout (~700 lines)
│   └── js/
│       ├── main.js           # window.FW helpers (formatINR, postJSON) — set immediately
│       ├── chat.js           # Chat UI: send/receive, typing dots, topic buttons
│       ├── budget.js         # Budget analyser: Chart.js donut, savings progress bar
│       ├── emi.js            # EMI calc: range sliders, donut chart, amortisation table
│       └── contact.js        # Inline form validation
└── templates/
    ├── base.html             # Navbar + footer + Bootstrap 5 base layout
    ├── index.html            # Home page
    ├── chat.html             # AI Chat interface
    ├── budget.html           # Budget Planner
    ├── emi.html              # EMI Calculator
    ├── scam.html             # Scam Awareness
    ├── about.html            # About page
    ├── contact.html          # Contact form
    ├── 404.html              # 404 error page
    └── 500.html              # 500 error page
```

---

## ⚙️ Setup & Run

### 1. Navigate to the project folder

```bash
cd "FinWise AI"
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root with the following:

```env
# Flask
SECRET_KEY=change-me-in-production
FLASK_ENV=development

# IBM watsonx credentials (personal IAM API key from cloud.ibm.com/iam/apikeys)
WATSONX_API_KEY=your-personal-iam-api-key

# watsonx.ai project UUID (create at cloud.ibm.com/watsonx → New project)
WATSONX_PROJECT_ID=your-project-uuid

# watsonx.ai region endpoint
WATSONX_AI_URL=https://au-syd.ml.cloud.ibm.com

# IBM watsonx Orchestrate instance URL (for future agent integration)
WATSONX_URL=https://api.au-syd.watson-orchestrate.cloud.ibm.com/instances/your-instance-id
```

### 5. Run the development server

```bash
python app.py
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

### 6. Verify IBM watsonx connection

```bash
curl http://localhost:5000/api/watsonx/status
```

Expected response when fully connected:

```json
{
  "iam_ok": true,
  "ai_ok": true,
  "project_set": true,
  "live_ok": true,
  "model": "meta-llama/llama-3-3-70b-instruct",
  "message": "IBM watsonx.ai fully operational. Live AI chat is active."
}
```

### 7. Production deployment (Gunicorn)

```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Flask session secret key — change in production |
| `WATSONX_API_KEY` | Yes | **Personal IBM Cloud IAM API key** from [cloud.ibm.com/iam/apikeys](https://cloud.ibm.com/iam/apikeys) |
| `WATSONX_PROJECT_ID` | Yes | watsonx.ai project UUID — create a project at [cloud.ibm.com/watsonx](https://cloud.ibm.com/watsonx) |
| `WATSONX_AI_URL` | Yes | watsonx.ai endpoint — `https://au-syd.ml.cloud.ibm.com` for Australia/Singapore |
| `WATSONX_URL` | No | IBM watsonx Orchestrate instance URL (for future agent/skill integration) |
| `FLASK_ENV` | No | `development` (enables debug mode) or `production` |

> ⚠️ **Important:** Use your **personal IBM Cloud API key**, not the auto-generated service credential that comes with an Orchestrate instance. The service credential cannot call watsonx.ai text generation endpoints.

---

## 🤖 IBM watsonx.ai Integration

The chat endpoint at `/api/chat` calls the **IBM watsonx.ai text/chat API** using the OpenAI-compatible chat completions format.

### How it works

```
User message
    ↓
POST /api/chat  (Flask)
    ↓
_get_iam_token()  →  IBM IAM (cached 55 min)
    ↓
POST /ml/v1/text/chat  →  IBM watsonx.ai (au-syd)
    ↓
choices[0].message.content  →  JSON response to browser
```

### Model

- **Model ID:** `meta-llama/llama-3-3-70b-instruct`
- **Endpoint:** `https://au-syd.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29`
- **Parameters:** `max_tokens: 400`, `temperature: 0.7`, `top_p: 0.9`
- **System prompt:** Finance-specialist persona (budgeting, EMI, scam awareness, Indian IT Act, etc.)

### Fallback behaviour

If the API key is missing, the project ID is not set, or the API call fails, the chat automatically falls back to **25+ curated keyword responses** covering all major finance topics — so the app is always usable even without credentials.

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Live IBM watsonx.ai chat. Body: `{"message": "..."}` |
| `POST` | `/api/budget` | Budget analysis. Body: `{"income": 50000, "rent": 12000, "food": 6000, ...}` |
| `POST` | `/api/emi` | EMI calculation. Body: `{"principal": 500000, "annual_rate": 8.5, "tenure_months": 60}` |
| `GET` | `/api/watsonx/status` | IBM watsonx connection health check |

---

## 🐛 Known Issues & Fixes Applied

| # | Issue | Fix |
|---|---|---|
| 1 | **No functionality on any page** | `window.FW` was undefined when page scripts ran. Fixed by setting it at the top of `main.js` and wrapping all page scripts in `DOMContentLoaded`. |
| 2 | **Service credential vs personal key** | Auto-generated Orchestrate service credential cannot call watsonx.ai. Use a personal IAM key. |
| 3 | **Truncated Orchestrate UUID** | Instance URL was missing `-f0bea2a0cc1f` suffix. Full UUID required. |
| 4 | **Wrong AI model / endpoint** | `ibm/granite-13b-chat-v2` not available in au-syd. Switched to Llama 3.3 70B via `/ml/v1/text/chat`. |
| 5 | **Missing `WATSONX_AI_URL` in .env** | App silently used hardcoded fallback. Now explicitly set in `.env`. |

---

## 📜 License

MIT License — © 2024 FinWise AI
