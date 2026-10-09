# 📝 "What Did I Miss?" — Complete Prompts & AI Engineering Log

This document records all the system prompts, engineering prompts, and development instructions used to build, configure, and operate the **What Did I Miss?** AI hackathon project.

---

## 🤖 1. Internal AI Engine Prompts (Used in `ai_service.py`)

These are the exact prompts engineered inside the Python backend to command Google Gemini to extract verified data and prevent hallucinations.

### A. System Instruction (Truth-in-AI Guardrails)
```text
You are an expert AI executive assistant analyzing a group chat conversation for someone who missed it.
Your task is to extract only verified facts and organize them into structured JSON.

CRITICAL RULES:
1. FACTUAL ACCURACY ONLY: Never invent or assume deadlines, names, decisions, meetings, or tasks.
2. UNCERTAINTIES: If something is unconfirmed, debated, or missing details (e.g., date, venue, assignee), explicitly list it in 'uncertainties' or label it 'Not specified'.
3. MENTIONS: If a specific target user name is provided, extract all messages where they are tagged, named, or given tasks.
4. URGENCY: Mark items as High, Medium, or Low priority based on explicit deadlines, blockers, or urgency stated in the text.
5. NO HALLUCINATION: If a category has no items (e.g. no meetings occurred), return an empty list.

Return strictly valid JSON adhering to the required schema.
```

### B. Conversation Analysis & Entity Extraction Prompt
```text
Analyze the following group chat conversation:
{The user reading this report is named: '[USER_NAME]'}

--- CONVERSATION START ---
[RAW_CHAT_TEXT]
--- CONVERSATION END ---

Extract:
1. overall_summary (2-3 concise sentences)
2. sentiment_or_vibe (e.g., 'Fast-paced crunch', 'Casual discussion', 'Calm and organized')
3. announcements (list of objects with: title, details, importance: 'High'|'Medium'|'Low', announced_by)
4. tasks (list of objects with: task, assignee, deadline, priority: 'High'|'Medium'|'Low', status: 'Pending')
5. deadlines (list of objects with: title, due_date, urgency: 'High'|'Medium'|'Low', related_to)
6. meetings (list of objects with: title, date_time, venue_or_link, agenda)
7. decisions (list of objects with: decision, context, agreed_by)
8. direct_mentions (list of objects with: sender, message, relevance, priority)
9. uncertainties (list of objects with: topic, missing_info)

Return strictly valid JSON adhering to this schema.
```

---

## 🗣️ 2. Development Prompts Used During Project Creation

These are the step-by-step master prompts used to generate and orchestrate the full-stack codebase.

### Prompt 1: Initial Architecture & Full-Stack Specification
```text
# Build a Complete AI Hackathon Project: What Did I Miss?

Act as an expert full-stack developer, AI engineer, UI/UX designer, and beginner-friendly coding mentor. Help me build a complete, functional AI-powered web application called “What Did I Miss?” for my first college hackathon.

I am a beginner in programming, so explain everything step by step and generate working code rather than just giving me a plan.

1. Project Overview:
Problem: People often miss important information in long, overwhelming group chats (deadlines, announcements, meetings, decisions, tasks, direct mentions).
Solution: AI-powered web app that summarizes what you missed into clean, categorized sections.

2. Core Features:
- Chat import (text paste + file upload)
- AI Summary
- Important announcements
- Tasks and action items with assignees & deadlines
- Meetings and events
- Decisions made
- Direct mentions for the user
- Urgency detection (High, Medium, Low)
- Search and filters
- Copy and export (.txt, .json)
- Sample conversation for 1-click judge testing
- Strict in-memory privacy without persistent disk logging

3. Tech Stack:
Use the most basic code stack and fastest one.
Backend: Python with FastAPI.
Frontend: Modern responsive UI with Tailwind CSS.
```

### Prompt 2: GitHub Repository Connection
```text
https://github.com/vijay-devcodes/what-did-i-miss- could you attach it to my github
```

### Prompt 3: Test Run & Visual Preview
```text
could you help me test run the code once? and show how it looks like
```

### Prompt 4: Judge Presentation Pitch
```text
how should i explain what i have done till now
```

### Prompt 5: Live Gemini API Integration
```text
use this api key to analyse the text input and sort it into the elements in the dashboard like the priorities and all that [API_KEY]
```

### Prompt 6: Remote Push
```text
Commite it to github
```

---

## 🎤 3. Hackathon Judge Pitch Prompt Template

Use this script when judges visit your table:

```text
"Judges, raise your hand if you've ever muted a group chat and missed a deadline or a task assigned to you.

We built 'What Did I Miss?' to solve group chat overload. In under one second, our app extracts:
1. Strict deadlines and urgency levels
2. Action items with assignees
3. Scheduled meetings and room links
4. Direct mentions personalized to your name
5. Confirmed team decisions

Unlike standard AI summaries, we enforce strict Truth-in-AI: unconfirmed information is explicitly flagged as 'Missing Details' rather than hallucinated. Everything runs in-memory with zero disk logging for privacy."
```

---

## 🧪 4. Sample Test Chat Prompts (For Live Demo)

### Hackathon Sprint Test Conversation:
```text
[02:15 AM] Liam: @Alex the backend API routes are deployed to production, but response latency is hovering around 1.2s. We need to cache the demo results.
[02:18 AM] Priya: Heads up team: I pushed the updated dark navy UI with electric blue accents! Looks super sleek.
[02:22 AM] Alex: Awesome work Priya! I will test the mobile responsiveness right now.
[02:30 AM] Sarah: IMPORTANT ANNOUNCEMENT from organizers: Devpost project submission closes strictly at 11:00 AM Sunday. No late submissions will be accepted!
[02:35 AM] Liam: That means our internal code freeze must be by 8:30 AM Sunday so Sarah has enough time to record the 2-minute demo video.
[02:40 AM] Alex: Agreed. Let's make that our final call: hard code freeze at 8:30 AM.
[02:45 AM] Sarah: Decided: We are dropping user authentication and going with 1-click demo guest mode so judges can evaluate without signup friction.
[03:10 AM] Priya: Action item for me: I will polish the priority badges and error banners before 6:00 AM.
[03:15 AM] Liam: @Alex urgent blocker: can you review my PR #14 for the rate-limiting middleware? We don't want the demo crashing during the live pitch.
[03:30 AM] Sarah: Meeting scheduled: Pitch rehearsal at 9:45 AM in Hackathon Lab Room 204. Everyone please be present.
[03:45 AM] Priya: TBD: Are judges allowed to test with custom chat files or only the provided sample data? Organizer desk was unclear about this.
[04:00 AM] Alex: I'll ask the track mentor at breakfast. Priya, get some sleep for 2 hours! Liam and I will monitor the endpoints.
```
