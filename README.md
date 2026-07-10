# FinWise AI – Digital Financial Literacy Assistant

A production-ready Flask web application designed to improve digital financial literacy using conversational AI powered by IBM watsonx Orchestrate.

---

## 🚀 Features

| Page | Description |
|---|---|
| **Home** | Landing page with hero banner, features, and benefits |
| **AI Chat** | Conversational assistant with IBM watsonx Orchestrate integration |
| **Budget Planner** | Income vs expense analyser with savings insights |
| **EMI Calculator** | Loan EMI, total interest & total payment calculator |
| **Scam Awareness** | Educational cards on common financial scams |
| **About** | Project overview and IBM technology stack |
| **Contact** | Contact form with client-side validation |

---

## 🛠 Tech Stack

- **Backend:** Python 3.11+, Flask 3.0
- **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3
- **AI Layer:** IBM watsonx Orchestrate (placeholder integration ready)
- **Deployment:** Gunicorn, IBM Cloud / any WSGI host

---

## 📁 Project Structure

```
FinWise AI/
├── app.py                  # Main Flask application
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── README.md
├── static/
│   ├── css/
│   │   └── style.css       # Global stylesheet
│   └── js/
│       └── main.js         # Global JavaScript
└── templates/
    ├── base.html           # Base layout (navbar + footer)
    ├── index.html          # Home page
    ├── chat.html           # AI Chat page
    ├── budget.html         # Budget Planner
    ├── emi.html            # EMI Calculator
    ├── scam.html           # Scam Awareness
    ├── about.html          # About page
    └── contact.html        # Contact page
```

---

## ⚙️ Setup & Run

### 1. Clone / download the project

```bash
cd "FinWise AI"
```

### 2. Create a virtual environment

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

```bash
cp .env.example .env
# Edit .env and add your IBM watsonx credentials
```

### 5. Run the development server

```bash
python app.py
```

Open your browser at [http://localhost:5000](http://localhost:5000)

### 6. Production deployment (Gunicorn)

```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

---

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `SECRET_KEY` | Flask session secret key |
| `WATSONX_API_KEY` | IBM watsonx Orchestrate API key |
| `WATSONX_PROJECT_ID` | IBM watsonx project ID |
| `WATSONX_URL` | IBM watsonx endpoint URL |
| `FLASK_ENV` | `development` or `production` |

---

## 🤖 IBM watsonx Orchestrate Integration

The chat endpoint at `/api/chat` is pre-wired for IBM watsonx Orchestrate. To activate it:

1. Set the `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, and `WATSONX_URL` environment variables.
2. Uncomment the live API call block in `app.py` inside the `chat_api()` function.
3. The application will automatically route chat messages to watsonx Orchestrate.

---

## 📜 License

MIT License — © 2024 FinWise AI
