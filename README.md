# ⚡ What Did I Miss?
> **AI-Powered Group Chat Summarizer — Catch up without scrolling forever.**
> Built for College AI Hackathon 2026.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%202.5-8E75C2.svg?logo=google&logoColor=white)](https://ai.google.dev/)
[![TailwindCSS](https://img.shields.io/badge/UI-TailwindCSS%203.4-38BDF8.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Privacy First](https://img.shields.io/badge/Privacy-Ephemeral%20In--Memory-10B981.svg)](https://github.com)

---

## 📌 Problem Statement
Group chats in college clubs, hackathon teams, and student project groups move fast. Missing even a few hours can mean waking up to **300+ unread messages**, resulting in:
- Missed assignment and project submission deadlines.
- Overlooked task assignments ("Wait, was I supposed to build that?").
- Confusion over final decisions and architectural pivots.
- Missing scheduled Zoom/Google Meet links or lab room changes.
- Scrolling through endless memes and banter just to find one urgent announcement.

## 💡 The Solution
**What Did I Miss?** is a zero-friction, privacy-conscious AI web application that ingests overwhelming chat histories and outputs an **action-oriented executive briefing** in seconds.

Unlike generic summarizers that produce vague paragraphs, **What Did I Miss?** uses **strict truth-in-AI validation** to categorize content into structured, actionable sections:
1. **🔥 Announcements** — Important notices and system updates.
2. **✅ Action Items & Tasks** — Explicit tasks with assignees, due dates, and completion checkboxes.
3. **⏰ Strict Deadlines** — Imminent milestones with urgency badges.
4. **📅 Scheduled Meetings** — Times, virtual links (Zoom/Meet), and room venues.
5. **⚖️ Decisions Made** — Final agreements and architectural calls.
6. **🎯 Direct Mentions** — Filtered quotes where your name/handle was specifically addressed.
7. **❓ Missing / Unconfirmed Info** — Transparently highlights uncertainties rather than hallucinating details.

---

## ✨ Key Features
- **1-Click Hackathon Demo Mode**: Ready out-of-the-box for judges with 3 preloaded real-world conversation datasets (*24h Hackathon Crunch*, *Senior Capstone Team*, and *Campus TechFest Committee*).
- **Dual AI Engine Architecture**:
  - **Live Google Gemini 2.5 Engine**: Powered by Google GenAI SDK for deep semantic understanding and context analysis.
  - **Deterministic Smart Extraction Engine**: 100% offline fallback that works with zero API keys or external internet connectivity.
- **Strict Anti-Hallucination Guardrails**: The system never invents names, deadlines, or decisions. If a detail is absent or debated, it is explicitly flagged under *Missing / Unconfirmed Information*.
- **Interactive Dashboard**:
  - Real-time search across all extracted items.
  - Category pill filters and urgency filters (**High** 🔴, **Medium** 🟡, **Low** 🟢).
  - Checkable action items (cross off tasks as you finish them).
  - One-click copy formatted Markdown summary or download as `.txt` / `.json`.
- **Privacy by Design**:
  - Ephemeral in-memory processing: zero database storage.
  - No chat logging to disk.
  - Safe file upload handling (UTF-8 validation, 2MB size cap, non-executable).

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend** | Python 3.10+, FastAPI, Uvicorn | Ultra-fast asynchronous REST API, automatic schema generation, beginner-friendly. |
| **Data Validation** | Pydantic v2 | Strict JSON schema parsing ensuring zero malformed frontend responses. |
| **AI / LLM** | Google Gemini (`gemini-2.5-flash`) via `google-genai` SDK | State-of-the-art reasoning, low latency, structured JSON mode. |
| **Frontend** | Modern Vanilla JS (ES6+), HTML5, Tailwind CSS | Zero build step or bundler complexity, instant loading, high-speed prototyping. |
| **UI Aesthetics** | Dark Navy (`#070B14`), Electric Blue, Purple Accents | High-end modern SaaS visual hierarchy with Lucide icons. |

---

## 📁 Project Structure

```text
what-did-i-miss/
├── main.py                  # FastAPI application server, endpoints, static file mounting
├── ai_service.py            # Dual AI engine (Gemini API integration + offline heuristic engine)
├── models.py                # Pydantic schemas for request & response validation
├── requirements.txt         # Python project dependencies
├── .env.example             # Example environment file with placeholder values
├── .gitignore               # Excludes secrets, bytecode, virtual environments
├── static/
│   ├── index.html           # Single-Page Application (Landing page + Dashboard)
│   ├── app.js               # Reactive frontend logic, state management, filters, export
│   ├── style.css            # Custom dark navy theme, glassmorphism, accent glow
│   └── demo_chats.json      # Realistic hackathon & team chat test scenarios
└── README.md                # Project documentation & presentation guide
```

---

## 🚀 Quickstart Guide (Local Setup)

### 1. Prerequisites
- Python 3.10, 3.11, 3.12, 3.13, or 3.14 installed (`python --version`)
- Git installed (`git --version`)

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/what-did-i-miss.git
cd what-did-i-miss
```

### 3. Install Dependencies
```bash
python -m pip install -r requirements.txt
```

### 4. Configure Environment (Optional)
The application works immediately in **Smart Offline Mode** without an API key. 

To enable live Google Gemini AI reasoning:
1. Copy the example configuration:
   ```bash
   cp .env.example .env
   # On Windows PowerShell:
   copy .env.example .env
   ```
2. Open `.env` and paste your free Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```
*(You can also enter your API key directly in the app's Settings modal via the web interface).*

### 5. Run the Application
```bash
python main.py
```
*Or directly via Uvicorn:*
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 6. Open in Browser
Visit **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser!

---

## 🔒 Privacy & Security Standards

- **Zero Permanent Storage**: Conversations and chat logs are processed in RAM and discarded immediately after generating the response.
- **Safe File Uploads**: Supported formats: `.txt`, `.chat`, `.log`, `.csv`, `.md`, `.json`. Size is strictly limited to 2MB. Files are decoded in memory as text and never saved or executed on disk.
- **No Chat Logging**: Server logs record only metadata (character length and timestamp), never raw message content or personal messages.
- **No Secret Leaks**: API keys are isolated on the backend or in client-side `localStorage`. `.gitignore` prevents inadvertent commits of `.env` files.

---

## 🎯 Hackathon Judging Demo Script (3-Minute Pitch)

1. **The Hook (0:00 - 0:30)**:
   > *"Judges, raise your hand if you've ever muted a team chat during a hackathon, only to miss the submission deadline or an urgent message asking for your code. That problem cost teams prizes every year. We built **What Did I Miss?** so no student ever overlooks a deadline again."*
2. **The 1-Click Demo (0:30 - 1:15)**:
   > *"Notice how easy testing is. We click **⚡ Hackathon Crunch Demo**, enter our name **Alex**, and hit **Extract What I Missed**."*
3. **The Results (1:15 - 2:00)**:
   > *"In under 1 second, our AI extracts: internal code freeze at 8:30 AM, Devpost deadline at 11:00 AM, task assignments for Priya and Liam, and highlights an urgent blocker message mentioning Alex directly."*
4. **The Innovation & Truth-in-AI (2:00 - 2:30)**:
   > *"Notice our **Missing / Unconfirmed** section. Unlike standard LLMs that make things up, our system explicitly warns the team that judge testing formats remain unconfirmed. Plus, everything runs in-memory with zero permanent chat logging."*
5. **Impact & Roadmap (2:30 - 3:00)**:
   > *"Next, we are building automated Discord and Slack bots with Google Calendar 1-click export!"*

---

## 🔮 Future Roadmap
- [ ] Direct Slack / Discord / WhatsApp Webhook integrations.
- [ ] 1-Click "Add to Google Calendar" / "Add to Apple Calendar" `.ics` export.
- [ ] Voice briefing audio readout for commuters.
- [ ] Multi-language chat translation and cross-lingual summaries.

---

## 📄 License
MIT License. Built with ❤️ for the College AI Hackathon.
