"""
FinWise AI – Digital Financial Literacy Assistant
Flask Application Entry Point
"""

import os
import time
import datetime
import requests as _requests
from flask import (
    Flask, render_template, request, jsonify, flash, redirect, url_for
)
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "finwise-dev-secret-2024")

# ---------------------------------------------------------------------------
# IBM watsonx configuration
# ---------------------------------------------------------------------------

WATSONX_API_KEY    = os.environ.get("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.environ.get("WATSONX_PROJECT_ID", "")

# watsonx.ai text-generation endpoint (au-syd region, same as the Orchestrate instance)
WATSONX_AI_URL = os.environ.get(
    "WATSONX_AI_URL",
    "https://au-syd.ml.cloud.ibm.com",
)

# Orchestrate instance URL (kept for future agent/skill calls)
WATSONX_ORCHESTRATE_URL = os.environ.get(
    "WATSONX_URL",
    "https://api.au-syd.watson-orchestrate.cloud.ibm.com/instances/5d0cb4d3-24cd-4940-80c2-f0bea2a0cc1f",
)

# IAM token cache  {token: str, expires_at: float}
_iam_token_cache: dict = {}

IBM_IAM_URL = "https://iam.cloud.ibm.com/identity/token"

# ---------------------------------------------------------------------------
# Curated smart responses — covers all common finance topics
# ---------------------------------------------------------------------------
_FALLBACK_RESPONSES = {
    # ---- Budgeting ----
    "50/30/20": (
        "The **50/30/20 rule** splits your income into three buckets:\n"
        "• **50%** for needs (rent, food, utilities, transport)\n"
        "• **30%** for wants (dining out, subscriptions, entertainment)\n"
        "• **20%** for savings & debt repayment\n\n"
        "Example: ₹50,000 income → ₹25,000 needs · ₹15,000 wants · ₹10,000 savings.\n"
        "Use our **Budget Planner** tool to calculate your exact split!"
    ),
    "budget": (
        "A solid monthly budget has four steps:\n"
        "1. **Track income** — all salary, freelance, and passive income\n"
        "2. **List fixed expenses** — rent, EMIs, insurance premiums\n"
        "3. **Estimate variable expenses** — food, transport, entertainment\n"
        "4. **Set a savings goal** — aim for at least 20% of income\n\n"
        "The **50/30/20 rule** is a great starting framework.\n"
        "Try our **Budget Planner** for an instant personalised analysis!"
    ),
    # ---- Savings ----
    "savings rate": (
        "A **savings rate** of 20% or more is considered healthy.\n"
        "• Under 10% → critical — increase urgently\n"
        "• 10–20% → acceptable — push higher\n"
        "• 20–30% → good — you're building wealth\n"
        "• 30%+ → excellent — financial independence track\n\n"
        "Tip: Automate savings on payday so it moves before you can spend it."
    ),
    "save": (
        "**Top savings strategies:**\n"
        "• **Pay yourself first** — transfer savings on the day you get paid\n"
        "• **SIP (Systematic Investment Plan)** — invest ₹500–₹5,000/month in mutual funds\n"
        "• **Recurring Deposits** — guaranteed returns, great for short-term goals\n"
        "• **Emergency fund** — keep 3–6 months of expenses in a liquid savings account\n\n"
        "Even ₹1,000/month invested at 12% p.a. for 20 years grows to ~₹9.9 lakhs!"
    ),
    "emergency fund": (
        "An **emergency fund** is 3–6 months of your total monthly expenses kept in a:\n"
        "• **Savings account** (instant access)\n"
        "• **Liquid mutual fund** (slightly better returns, 1-day withdrawal)\n\n"
        "Example: If monthly expenses = ₹30,000, keep ₹90,000–₹1,80,000 as an emergency buffer.\n"
        "Build it before investing in equity or paying off low-interest debt."
    ),
    # ---- EMI & Loans ----
    "emi": (
        "**EMI formula:** EMI = P × R × (1+R)^N ÷ [(1+R)^N − 1]\n"
        "where P = Principal, R = Monthly rate (annual rate ÷ 12 ÷ 100), N = Tenure in months\n\n"
        "**Example:** ₹5 lakh loan at 10% p.a. for 5 years\n"
        "→ Monthly EMI ≈ ₹10,624 · Total interest ≈ ₹1.37 lakhs\n\n"
        "Use our **EMI Calculator** for instant results with an amortisation table!"
    ),
    "loan": (
        "**Before taking a loan:**\n"
        "• Compare interest rates from 3+ lenders\n"
        "• Check the processing fee and prepayment charges\n"
        "• Ensure EMI ≤ 40% of your monthly take-home pay\n"
        "• Prefer shorter tenures to reduce total interest paid\n\n"
        "**Good debt vs bad debt:**\n"
        "Good → home loan, education loan (builds assets/income)\n"
        "Bad → personal loan for gadgets, credit card revolving debt"
    ),
    "home loan": (
        "**Home loan tips:**\n"
        "• Minimum 20% down payment reduces EMI and total interest\n"
        "• Compare repo-linked rates (RLLR) — they adjust with RBI policy\n"
        "• Tax benefit: deduction up to ₹2L on interest (Sec 24b) + ₹1.5L on principal (Sec 80C)\n"
        "• EMI should not exceed 40% of net monthly income\n\n"
        "Use our **EMI Calculator** to plan your home loan payments!"
    ),
    # ---- Investing ----
    "invest": (
        "**Beginner investing roadmap:**\n"
        "1. Build an emergency fund first (3–6 months expenses)\n"
        "2. Start a SIP in a low-cost index fund (Nifty 50 / Nifty Next 50)\n"
        "3. Add debt funds for stability (20–30% of portfolio)\n"
        "4. Gradually add gold ETF (5–10%) for diversification\n\n"
        "**Rule of 72:** Divide 72 by your return rate to get years to double money.\n"
        "At 12% returns, money doubles every 6 years!"
    ),
    "mutual fund": (
        "**Mutual funds — key types:**\n"
        "• **Equity funds** — higher risk, higher returns (10–15% long-term)\n"
        "• **Debt funds** — lower risk, stable returns (6–8%)\n"
        "• **Index funds** — track Nifty/Sensex, lowest cost (~0.1% expense ratio)\n"
        "• **ELSS** — tax-saving equity fund under Section 80C (3-year lock-in)\n\n"
        "**SIP tip:** ₹5,000/month in an index fund for 20 years at 12% = ~₹49.9 lakhs!"
    ),
    "sip": (
        "**SIP (Systematic Investment Plan):**\n"
        "Invest a fixed amount every month in a mutual fund automatically.\n\n"
        "**Benefits:**\n"
        "• Rupee cost averaging — buy more units when prices are low\n"
        "• Disciplined investing without timing the market\n"
        "• Start with as little as ₹100/month\n\n"
        "**Best SIP platforms:** Zerodha Coin, Groww, Kuvera (all zero commission)."
    ),
    "stock": (
        "**Stock market basics:**\n"
        "• Stocks = ownership stake in a company\n"
        "• Nifty 50 = top 50 companies by market cap in India\n"
        "• Long-term equity historically returns 12–15% p.a. in India\n\n"
        "**Beginner advice:** Start with index funds (not individual stocks).\n"
        "Avoid trading/speculation — 90% of day traders lose money.\n"
        "Invest only what you won't need for 5+ years."
    ),
    # ---- Credit ----
    "credit score": (
        "**Credit score ranges (CIBIL):**\n"
        "• 750–900 → Excellent (best loan rates)\n"
        "• 700–749 → Good\n"
        "• 650–699 → Fair (higher interest rates)\n"
        "• Below 650 → Poor (loans may be rejected)\n\n"
        "**Improve your score:**\n"
        "• Pay all EMIs and credit card bills on time\n"
        "• Keep credit utilisation below 30%\n"
        "• Don't apply for multiple loans at once\n"
        "• Check your CIBIL report for errors at cibil.com"
    ),
    "credit": (
        "**Credit card tips:**\n"
        "• **Always pay the full bill**, never just the minimum — revolving debt charges 36–48% p.a.!\n"
        "• Keep credit utilisation below 30% (used ÷ limit)\n"
        "• Use cards for rewards/cashback but treat them like a debit card\n"
        "• Never withdraw cash from a credit card — fees + interest from day 1\n\n"
        "A well-managed credit card is a powerful tool; mismanaged, it's a debt trap."
    ),
    # ---- Scam & Safety ----
    "scam": (
        "**Most common financial scams in India:**\n"
        "• **OTP fraud** — someone calls pretending to be your bank and asks for the OTP you just received\n"
        "• **QR code scam** — scanning a QR code can DEBIT your account, not credit it\n"
        "• **Fake loan apps** — illegal apps that charge 100%+ interest and blackmail borrowers\n"
        "• **Phishing** — fake bank/IT dept emails/SMS with malicious links\n"
        "• **Investment fraud** — Ponzi schemes promising 30%+ monthly returns\n\n"
        "**Golden rule:** No bank/government will ever ask for your OTP, PIN, or CVV. 🔒\n"
        "Visit our **Scam Awareness** page for detailed protection guides!"
    ),
    "otp": (
        "**OTP scam — how it works:**\n"
        "A caller claims to be from your bank, TRAI, or KYC team and says your account will be blocked.\n"
        "They ask you to 'share' or 'read out' an OTP you just received.\n\n"
        "**Reality:** The OTP is for a transaction THEY are initiating with your account.\n\n"
        "**Protection:** Hang up immediately. OTPs are one-time passwords — sharing them gives "
        "full transaction access. Call your bank's official number if concerned."
    ),
    "phishing": (
        "**Phishing — how to spot it:**\n"
        "• Email/SMS from a lookalike domain (e.g. sbi-bank-alert.com instead of sbi.co.in)\n"
        "• Urgency: 'Your account will be blocked in 24 hours'\n"
        "• Links that don't match the bank's official URL\n\n"
        "**Protection:**\n"
        "• Never click links in SMS/email — go directly to the official website\n"
        "• Check the full URL before entering any credentials\n"
        "• Enable 2FA on all financial accounts"
    ),
    # ---- Tax ----
    "tax": (
        "**Key tax-saving options under Indian IT Act:**\n"
        "• **Section 80C** (₹1.5L limit): PPF, ELSS, NSC, life insurance premium, home loan principal\n"
        "• **Section 80D**: Health insurance premium (₹25K self, ₹50K parents)\n"
        "• **Section 24b**: Home loan interest deduction (₹2L for self-occupied)\n"
        "• **NPS (Section 80CCD(1B))**: Additional ₹50K deduction\n\n"
        "New tax regime (default from FY24-25): No deductions but lower slab rates.\n"
        "Compare both regimes with a CA to choose the better option."
    ),
    # ---- Retirement ----
    "retirement": (
        "**Retirement planning basics:**\n"
        "• Start as early as possible — compounding does the heavy lifting\n"
        "• **EPF** — mandatory, ~8.25% p.a. returns, tax-free on maturity\n"
        "• **NPS** — market-linked, 60% equity + 40% debt option, tax benefits\n"
        "• **PPF** — 7.1% guaranteed, 15-year lock-in, tax-free\n\n"
        "**Rule of thumb:** You need ~25× your annual expenses saved at retirement.\n"
        "Example: Spending ₹60K/month = ₹72L/year → need ~₹1.8 crore corpus."
    ),
    # ---- Insurance ----
    "insurance": (
        "**Essential insurance policies every Indian should have:**\n"
        "• **Term life insurance** — 10–15× annual income coverage (pure protection, not investment)\n"
        "• **Health insurance** — minimum ₹5L family floater (medical inflation ~14% p.a.)\n"
        "• **Avoid ULIPs and endowment plans** — poor returns + high commissions\n\n"
        "Tip: Buy term + health insurance EARLY when you're healthy — premiums are much lower."
    ),
    # ---- UPI/Digital ----
    "upi": (
        "**UPI safety tips:**\n"
        "• Never share your UPI PIN — it's like your ATM PIN, only you should know it\n"
        "• **QR codes are for PAYING, not receiving** — you never need a PIN to receive money\n"
        "• Set a daily transaction limit (recommended: ₹10,000–₹25,000)\n"
        "• Use separate UPI IDs for different apps for better tracking\n"
        "• Report fraud immediately at 1930 (cybercrime helpline)"
    ),
    # ---- General greetings ----
    "hello": (
        "👋 Hello! I'm **FinWise AI**, your digital financial literacy assistant.\n\n"
        "I can help you with:\n"
        "• 💰 **Budgeting** — 50/30/20 rule, expense tracking\n"
        "• 📊 **Investing** — mutual funds, SIPs, stocks\n"
        "• 🏦 **Loans & EMI** — home loans, personal loans\n"
        "• 🛡️ **Scam awareness** — OTP fraud, phishing, fake apps\n"
        "• 📋 **Tax saving** — 80C, NPS, health insurance\n"
        "• 🏆 **Credit score** — how to improve your CIBIL score\n\n"
        "What would you like to know about today?"
    ),
    "hi": (
        "👋 Hi there! I'm **FinWise AI**. Ask me anything about personal finance — "
        "budgeting, saving, investing, loans, taxes, or scam awareness. What's on your mind?"
    ),
    "help": (
        "I'm **FinWise AI** and I can help you with:\n\n"
        "🔹 **Budget Planner** — analyse your income vs expenses\n"
        "🔹 **EMI Calculator** — calculate loan repayments\n"
        "🔹 **Scam Awareness** — recognise and avoid financial fraud\n"
        "🔹 **Investment guidance** — SIPs, mutual funds, stocks\n"
        "🔹 **Tax tips** — Section 80C, NPS, health insurance deductions\n"
        "🔹 **Credit score** — how to build and maintain a good score\n\n"
        "Just ask your question in plain language — no finance degree needed! 😊"
    ),
}

_DEFAULT_RESPONSE = (
    "I'm **FinWise AI**, your digital financial literacy assistant powered by IBM watsonx. 🤖\n\n"
    "I can help you with budgeting, saving, investing, loans, EMIs, credit scores, "
    "tax saving, scam awareness, and much more.\n\n"
    "Try asking:\n"
    "• *\"How do I create a monthly budget?\"*\n"
    "• *\"What is a SIP in mutual funds?\"*\n"
    "• *\"How do I improve my credit score?\"*\n"
    "• *\"What are common online scams to watch out for?\"*"
)


def _get_iam_token() -> str:
    """
    Exchange the IBM API key for a short-lived IAM Bearer token.
    Caches the token until 5 minutes before expiry.
    """
    now = time.time()
    cached = _iam_token_cache.get("token")
    expires_at = _iam_token_cache.get("expires_at", 0)

    if cached and now < expires_at:
        return cached

    resp = _requests.post(
        IBM_IAM_URL,
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": WATSONX_API_KEY,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    token = data["access_token"]
    # expires_in is in seconds; cache with 5-min buffer
    _iam_token_cache["token"]      = token
    _iam_token_cache["expires_at"] = now + data.get("expires_in", 3600) - 300
    return token


_SYSTEM_PROMPT = (
    "You are FinWise AI, a helpful and friendly digital financial literacy assistant "
    "powered by IBM watsonx. You specialise in personal finance topics for Indian users, "
    "including budgeting, savings, EMI calculations, mutual funds, investing, credit scores, "
    "tax saving under Indian IT Act, and scam awareness. "
    "Keep answers concise (3–6 sentences), accurate, friendly, and jargon-free. "
    "Use bullet points where helpful. Always respond in plain English."
)

# Model available in au-syd region with this account
_WATSONX_MODEL = "meta-llama/llama-3-3-70b-instruct"


def _watsonx_chat(user_message: str) -> str:
    """
    Call IBM watsonx.ai text/chat endpoint (chat-completions format).

    Endpoint : POST {WATSONX_AI_URL}/ml/v1/text/chat?version=2023-05-29
    Model    : meta-llama/llama-3-3-70b-instruct  (available in au-syd)
    Auth     : IBM IAM Bearer token (exchanged from WATSONX_API_KEY)
    Ref      : https://cloud.ibm.com/apidocs/watsonx-ai#text-chat
    """
    if not WATSONX_API_KEY or not WATSONX_PROJECT_ID:
        app.logger.info("watsonx.ai: API key or project ID missing — using keyword fallback")
    else:
        try:
            token = _get_iam_token()

            payload = {
                "model_id":   _WATSONX_MODEL,
                "project_id": WATSONX_PROJECT_ID,
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": user_message},
                ],
                "max_tokens":        400,
                "temperature":       0.7,
                "top_p":             0.9,
                "frequency_penalty": 0.1,
            }

            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type":  "application/json",
                "Accept":        "application/json",
            }

            resp = _requests.post(
                f"{WATSONX_AI_URL}/ml/v1/text/chat?version=2023-05-29",
                json=payload,
                headers=headers,
                timeout=35,
            )

            if resp.status_code == 200:
                reply = (
                    resp.json()
                    .get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                    .strip()
                )
                if reply:
                    app.logger.info("watsonx.ai: response OK (%d chars)", len(reply))
                    return reply

            else:
                try:
                    err = resp.json().get("errors", [{}])[0]
                    code   = err.get("code", "")
                    detail = err.get("message", resp.text[:200])
                except Exception:
                    code, detail = "", resp.text[:200]

                app.logger.warning(
                    "watsonx.ai HTTP %s [%s]: %s", resp.status_code, code, detail[:200]
                )
                if resp.status_code == 401:
                    return "IBM watsonx authentication failed — please check the API key."
                if resp.status_code == 403:
                    return "IBM watsonx access denied — the API key may not have permission for this project."

        except _requests.exceptions.ConnectionError:
            app.logger.warning("watsonx.ai: connection error")
            return "I couldn't reach IBM watsonx right now. Please check your internet and try again."
        except _requests.exceptions.Timeout:
            app.logger.warning("watsonx.ai: request timed out after 35s")
            return "IBM watsonx took too long to respond. Please try again in a moment."
        except Exception as exc:
            app.logger.warning("watsonx.ai call failed: %s", exc)

    # Keyword-based fallback
    msg_lower = user_message.lower()
    for keyword, response in _FALLBACK_RESPONSES.items():
        if keyword in msg_lower:
            return response
    return _DEFAULT_RESPONSE


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/chat")
def chat():
    return render_template("chat.html")


@app.route("/budget")
def budget():
    return render_template("budget.html")


@app.route("/emi")
def emi():
    return render_template("emi.html")


@app.route("/scam")
def scam():
    return render_template("scam.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        subject = request.form.get("subject", "").strip()
        message = request.form.get("message", "").strip()

        errors = []
        if not name:
            errors.append("Name is required.")
        if not email or "@" not in email:
            errors.append("A valid email address is required.")
        if not subject:
            errors.append("Subject is required.")
        if not message:
            errors.append("Message is required.")

        if errors:
            for err in errors:
                flash(err, "danger")
            return render_template(
                "contact.html",
                form_data={"name": name, "email": email,
                           "subject": subject, "message": message},
            )

        # In production: send email / persist to DB here
        flash("Thank you for reaching out! We'll get back to you shortly.", "success")
        return redirect(url_for("contact"))

    return render_template("contact.html", form_data={})


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------

@app.route("/api/chat", methods=["POST"])
def chat_api():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    reply = _watsonx_chat(user_message)
    return jsonify({
        "reply": reply,
        "timestamp": datetime.datetime.now().strftime("%I:%M %p"),
    })


@app.route("/api/budget", methods=["POST"])
def budget_api():
    data = request.get_json(silent=True) or {}
    try:
        income = float(data.get("income", 0))
        rent = float(data.get("rent", 0))
        food = float(data.get("food", 0))
        transport = float(data.get("transport", 0))
        utilities = float(data.get("utilities", 0))
        entertainment = float(data.get("entertainment", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid numeric input"}), 400

    total_expenses = rent + food + transport + utilities + entertainment
    savings = income - total_expenses
    savings_pct = round((savings / income * 100), 2) if income > 0 else 0

    suggestions = []
    if savings_pct < 0:
        suggestions.append("⚠️ Your expenses exceed your income. Review and cut discretionary spending immediately.")
    elif savings_pct < 10:
        suggestions.append("Your savings rate is critically low. Target at least 20% savings.")
    elif savings_pct < 20:
        suggestions.append("Good start! Try to push savings above 20% by trimming entertainment or food costs.")
    else:
        suggestions.append("Excellent savings rate! Consider investing the surplus in SIPs or index funds.")

    if rent / income > 0.35 if income > 0 else False:
        suggestions.append("Rent is above 35% of income. Explore co-living or relocation options.")
    if entertainment / income > 0.10 if income > 0 else False:
        suggestions.append("Entertainment spending is high. Set a monthly cap to free up more savings.")

    return jsonify({
        "total_expenses": round(total_expenses, 2),
        "savings": round(savings, 2),
        "savings_pct": savings_pct,
        "suggestions": suggestions,
    })


@app.route("/api/emi", methods=["POST"])
def emi_api():
    data = request.get_json(silent=True) or {}
    try:
        principal = float(data.get("principal", 0))
        annual_rate = float(data.get("annual_rate", 0))
        tenure_months = int(data.get("tenure_months", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid numeric input"}), 400

    if principal <= 0 or annual_rate <= 0 or tenure_months <= 0:
        return jsonify({"error": "All values must be greater than zero"}), 400

    monthly_rate = annual_rate / (12 * 100)
    emi = (principal * monthly_rate * (1 + monthly_rate) ** tenure_months) / \
          ((1 + monthly_rate) ** tenure_months - 1)
    total_payment = emi * tenure_months
    total_interest = total_payment - principal

    return jsonify({
        "emi": round(emi, 2),
        "total_interest": round(total_interest, 2),
        "total_payment": round(total_payment, 2),
    })


@app.route("/api/watsonx/status", methods=["GET"])
def watsonx_status():
    """
    Health-check endpoint for IBM watsonx connectivity.
    Returns:
      iam_ok      – API key successfully exchanges for an IAM Bearer token
      ai_ok       – watsonx.ai generation endpoint is reachable
      project_set – WATSONX_PROJECT_ID is configured
      message     – human-readable status summary
    """
    if not WATSONX_API_KEY:
        return jsonify({
            "iam_ok":      False,
            "ai_ok":       False,
            "project_set": False,
            "message":     "No API key configured (set WATSONX_API_KEY in .env).",
        }), 200

    # 1. IAM token exchange
    try:
        token  = _get_iam_token()
        iam_ok = bool(token)
    except Exception as exc:
        return jsonify({
            "iam_ok":      False,
            "ai_ok":       False,
            "project_set": bool(WATSONX_PROJECT_ID),
            "message":     f"IAM token exchange failed: {exc}",
        }), 200

    project_set = bool(WATSONX_PROJECT_ID)

    # 2. Probe watsonx.ai endpoint (foundation models list — no project needed)
    ai_ok = False
    ai_msg = ""
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type":  "application/json",
        }
        probe = _requests.get(
            f"{WATSONX_AI_URL}/ml/v1/foundation_model_specs?version=2023-05-29&limit=1",
            headers=headers,
            timeout=12,
        )
        ai_ok  = probe.status_code == 200
        ai_msg = "" if ai_ok else f"watsonx.ai returned HTTP {probe.status_code}"
    except Exception as exc:
        ai_msg = f"watsonx.ai unreachable: {exc}"

    # 3. Quick live generation probe (only if project_id set)
    live_ok  = False
    live_msg = ""
    if project_set and iam_ok:
        try:
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            probe2 = _requests.post(
                f"{WATSONX_AI_URL}/ml/v1/text/chat?version=2023-05-29",
                json={
                    "model_id":   _WATSONX_MODEL,
                    "project_id": WATSONX_PROJECT_ID,
                    "messages":   [{"role": "user", "content": "Say: OK"}],
                    "max_tokens": 10,
                },
                headers=headers,
                timeout=20,
            )
            live_ok = probe2.status_code == 200
            if not live_ok:
                live_msg = probe2.json().get("errors", [{}])[0].get("message", "")[:120]
        except Exception as exc:
            live_msg = str(exc)[:120]

    # Build summary message
    if not iam_ok:
        msg = "IAM authentication failed. Check the API key."
    elif not ai_ok:
        msg = f"IAM OK, but {ai_msg}."
    elif not project_set:
        msg = "IBM watsonx.ai endpoint reachable. Set WATSONX_PROJECT_ID in .env to enable live AI."
    elif live_ok:
        msg = "IBM watsonx.ai fully operational. Live AI chat is active."
    else:
        msg = f"Endpoint reachable, but live generation failed: {live_msg}"

    return jsonify({
        "iam_ok":         iam_ok,
        "ai_ok":          ai_ok,
        "project_set":    project_set,
        "live_ok":        live_ok,
        "model":          _WATSONX_MODEL,
        "watsonx_ai_url": WATSONX_AI_URL,
        "message":        msg,
    }), 200


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404


@app.errorhandler(500)
def internal_error(e):
    return render_template("500.html"), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    debug = os.environ.get("FLASK_ENV", "production") == "development"
    app.run(debug=debug, host="0.0.0.0", port=5000)
