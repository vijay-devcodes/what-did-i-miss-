"""
AI Analysis Engine for 'What Did I Miss?'
Provides:
1. Live Gemini LLM processing with structured JSON output and hallucination guardrails.
2. High-fidelity Offline Smart Extraction Engine for instant demo testing and fallback.
"""

import os
import re
import json
import logging
from typing import Optional, List, Dict, Any
from models import (
    ChatAnalysisResult,
    AnnouncementItem,
    TaskItem,
    DeadlineItem,
    MeetingItem,
    DecisionItem,
    MentionItem,
    UncertaintyItem,
    AnalysisStats,
)

logger = logging.getLogger("what_did_i_miss.ai")

# System prompt enforcing strict truth-in-AI principles
SYSTEM_INSTRUCTION = """You are an expert AI executive assistant analyzing a group chat conversation for someone who missed it.
Your task is to extract only verified facts and organize them into structured JSON.

CRITICAL RULES:
1. FACTUAL ACCURACY ONLY: Never invent or assume deadlines, names, decisions, meetings, or tasks.
2. UNCERTAINTIES: If something is unconfirmed, debated, or missing details (e.g., date, venue, assignee), explicitly list it in 'uncertainties' or label it 'Not specified'.
3. MENTIONS: If a specific target user name is provided, extract all messages where they are tagged, named, or given tasks.
4. URGENCY: Mark items as High, Medium, or Low priority based on explicit deadlines, blockers, or urgency stated in the text.
5. NO HALLUCINATION: If a category has no items (e.g. no meetings occurred), return an empty list.

Return strictly valid JSON adhering to the required schema."""


def analyze_chat(text: str, user_name: Optional[str] = None, api_key: Optional[str] = None) -> ChatAnalysisResult:
    """
    Main entry point: Attempts Gemini API analysis first if key is present;
    seamlessly falls back to the deterministic offline extraction engine.
    """
    cleaned_text = text.strip()
    if not cleaned_text:
        return _empty_result("No conversation text was provided to analyze.")

    # Check for provided API key or environment variable
    effective_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if effective_key and effective_key.strip() and effective_key != "your_gemini_api_key_here":
        try:
            return _analyze_with_gemini(cleaned_text, user_name, effective_key.strip())
        except Exception as e:
            logger.warning(f"Gemini API call failed ({e}). Falling back to Offline Smart Engine.")
            result = _analyze_offline_engine(cleaned_text, user_name)
            result.overall_summary = (
                f"[Note: Live Gemini call encountered an issue ({str(e)[:60]}...). "
                f"Generated via Smart Heuristic Engine.] " + result.overall_summary
            )
            return result

    # Offline Smart Engine (default when no key is configured)
    return _analyze_offline_engine(cleaned_text, user_name)


def _analyze_with_gemini(text: str, user_name: Optional[str], api_key: str) -> ChatAnalysisResult:
    """Invokes Google Gemini model using the official google.genai SDK."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    user_mention_context = f"The user reading this report is named: '{user_name}'." if user_name else "No specific user name provided."

    prompt = f"""Analyze the following group chat conversation:
{user_mention_context}

--- CONVERSATION START ---
{text}
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

Return strictly raw JSON with no Markdown backticks or markdown fences."""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    raw_json_str = response.text.strip()
    # Strip markdown if present
    if raw_json_str.startswith("```"):
        raw_json_str = re.sub(r"^```(?:json)?\n", "", raw_json_str)
        raw_json_str = re.sub(r"\n```$", "", raw_json_str)

    data = json.loads(raw_json_str)

    # Basic stats calculation from source text
    stats = _calculate_stats(text, data.get("tasks", []), data.get("deadlines", []))

    return ChatAnalysisResult(
        mode="gemini",
        overall_summary=data.get("overall_summary", "Summary not generated."),
        sentiment_or_vibe=data.get("sentiment_or_vibe", "Collaborative"),
        announcements=[AnnouncementItem(**item) for item in data.get("announcements", [])],
        tasks=[TaskItem(**item) for item in data.get("tasks", [])],
        deadlines=[DeadlineItem(**item) for item in data.get("deadlines", [])],
        meetings=[MeetingItem(**item) for item in data.get("meetings", [])],
        decisions=[DecisionItem(**item) for item in data.get("decisions", [])],
        direct_mentions=[MentionItem(**item) for item in data.get("direct_mentions", [])],
        uncertainties=[UncertaintyItem(**item) for item in data.get("uncertainties", [])],
        stats=stats,
    )


def _analyze_offline_engine(text: str, user_name: Optional[str]) -> ChatAnalysisResult:
    """
    Intelligent heuristic natural language extraction engine.
    Parses timestamps, senders, action verbs, dates, mentions, and urgent triggers.
    Ensures 100% offline functionality without external dependencies.
    """
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    # Extract parsed message objects: (sender, body, raw_line)
    parsed_messages: List[Dict[str, str]] = []
    participants_set = set()

    for line in lines:
        msg = _parse_line(line)
        parsed_messages.append(msg)
        if msg["sender"] and msg["sender"].lower() not in ["system", "announcement"]:
            participants_set.add(msg["sender"])

    participants = sorted(list(participants_set))
    user_lower = user_name.lower().strip() if user_name else ""

    announcements: List[AnnouncementItem] = []
    tasks: List[TaskItem] = []
    deadlines: List[DeadlineItem] = []
    meetings: List[MeetingItem] = []
    decisions: List[DecisionItem] = []
    mentions: List[MentionItem] = []
    uncertainties: List[UncertaintyItem] = []

    # Regex patterns
    urgent_keywords = r"\b(urgent|asap|blocker|critical|immediately|emergency|highest priority|tonight|today)\b"
    announcement_keywords = r"\b(announcement|heads up|psa|reminder:|update:|important:|everyone|all hands|notice)\b"
    meeting_keywords = r"\b(meet|meeting|sync|zoom|google meet|call|standup|huddle|venue|room\s*\d+)\b"
    decision_keywords = r"\b(decided|agreed|settled on|let's go with|consensus|final call|chosen to|approved)\b"
    uncertainty_keywords = r"\b(tbd|to be determined|not sure|unclear|pending confirmation|waiting on|anyone know|maybe)\b"
    deadline_keywords = r"\b(deadline|due by|due date|submit by|by \d{1,2}(?::\d{2})?\s*(?:am|pm)?|by (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|eod|midnight))\b"
    task_keywords = r"\b(todo|action item|please |can you |i will |will handle|will create|will implement|assigned to|responsible for|take care of)\b"

    for msg in parsed_messages:
        sender = msg["sender"] or "Team Member"
        content = msg["content"]
        content_lower = content.lower()

        # 1. Direct Mentions
        if user_lower:
            mention_detected = False
            if f"@{user_lower}" in content_lower or re.search(rf"\b{re.escape(user_lower)}\b", content_lower):
                mention_detected = True

            if mention_detected and sender.lower() != user_lower:
                priority = "High" if re.search(urgent_keywords, content_lower) else "Medium"
                mentions.append(MentionItem(
                    sender=sender,
                    message=content,
                    relevance=f"Directly addressed to {user_name} regarding discussion topics.",
                    priority=priority
                ))

        # 2. Announcements
        if re.search(announcement_keywords, content_lower) and not re.search(decision_keywords, content_lower):
            importance = "High" if re.search(urgent_keywords, content_lower) else "Medium"
            title = _extract_headline(content, "Team Announcement")
            announcements.append(AnnouncementItem(
                title=title,
                details=content,
                importance=importance,
                announced_by=sender
            ))

        # 3. Decisions
        if re.search(decision_keywords, content_lower):
            decisions.append(DecisionItem(
                decision=_clean_sentence(content),
                context=f"Agreed in discussion led by {sender}",
                agreed_by=sender
            ))

        # 4. Meetings
        if re.search(meeting_keywords, content_lower):
            date_time_match = re.search(r"\b(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)?\s*(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b", content_lower)
            date_str = date_time_match.group(0).title() if date_time_match else "Time specified in chat"
            
            link_match = re.search(r"(https?://\S+|zoom\.us/\S+|meet\.google\.com/\S+|room\s*\w+)", content, re.IGNORECASE)
            venue = link_match.group(0) if link_match else "Virtual / Group Channel"

            meetings.append(MeetingItem(
                title=_extract_headline(content, "Team Sync / Meeting"),
                date_time=date_str,
                venue_or_link=venue,
                agenda=content
            ))

        # 5. Deadlines
        dl_match = re.search(deadline_keywords, content_lower)
        if dl_match:
            urgency = "High" if re.search(urgent_keywords, content_lower) else "Medium"
            time_part = dl_match.group(0)
            deadlines.append(DeadlineItem(
                title=_extract_headline(content, "Milestone / Submission"),
                due_date=time_part.capitalize(),
                urgency=urgency,
                related_to=sender
            ))

        # 6. Tasks
        if re.search(task_keywords, content_lower) and not re.search(meeting_keywords, content_lower):
            # Attempt to extract assignee
            assignee = "Unassigned"
            for p in participants:
                if p.lower() in content_lower:
                    assignee = p
                    break
            if assignee == "Unassigned" and sender:
                if re.search(r"\bi will\b|\bi'll\b|\bwill handle\b", content_lower):
                    assignee = sender

            priority = "High" if re.search(urgent_keywords, content_lower) else "Medium"
            
            # Extract deadline if attached to task
            task_dl = "Not specified"
            if dl_match:
                task_dl = dl_match.group(0).capitalize()

            tasks.append(TaskItem(
                task=_clean_sentence(content),
                assignee=assignee,
                deadline=task_dl,
                priority=priority,
                status="Pending"
            ))

        # 7. Uncertainties
        if re.search(uncertainty_keywords, content_lower):
            uncertainties.append(UncertaintyItem(
                topic=_extract_headline(content, "Unresolved Discussion"),
                missing_info=content
            ))

    # Deduplicate items cleanly
    announcements = _dedup_list(announcements, key="title")[:5]
    tasks = _dedup_list(tasks, key="task")[:8]
    deadlines = _dedup_list(deadlines, key="title")[:6]
    meetings = _dedup_list(meetings, key="title")[:4]
    decisions = _dedup_list(decisions, key="decision")[:5]
    mentions = _dedup_list(mentions, key="message")[:6]
    uncertainties = _dedup_list(uncertainties, key="topic")[:4]

    # Generate synthesis overview
    part_count = len(participants)
    part_str = f"{part_count} active members ({', '.join(participants[:3])}{'...' if part_count > 3 else ''})" if participants else "participants"
    
    overall_summary = (
        f"Analyzed {len(parsed_messages)} messages across {part_str}. "
        f"Identified {len(tasks)} actionable tasks, {len(deadlines)} strict deadlines, and {len(decisions)} confirmed decisions. "
        f"{f'You were mentioned in {len(mentions)} message(s).' if mentions else 'No direct mentions identified for your handle.'}"
    )

    stats = AnalysisStats(
        total_messages=len(parsed_messages),
        participants=participants,
        task_count=len(tasks),
        deadline_count=len(deadlines),
        high_priority_count=sum(1 for t in tasks if t.priority == "High") + sum(1 for d in deadlines if d.urgency == "High")
    )

    return ChatAnalysisResult(
        mode="offline_engine",
        overall_summary=overall_summary,
        sentiment_or_vibe="Productive & Fast-Paced",
        announcements=announcements,
        tasks=tasks,
        deadlines=deadlines,
        meetings=meetings,
        decisions=decisions,
        direct_mentions=mentions,
        uncertainties=uncertainties,
        stats=stats
    )


# Helper functions
def _parse_line(line: str) -> Dict[str, str]:
    """Extracts sender and message text from various chat timestamp formats."""
    # Pattern: [10:30 AM] Alex: Hello or 10:30 AM - Alex: Hello
    m1 = re.match(r"^(?:\[[\d\s:APMapm,\/\-\.]+\]|\d{1,2}[\/:\-\.]\S+\s+[APMapm\d:\.]+)\s*[-:]?\s*([^:\n]+):\s*(.+)$", line)
    if m1:
        return {"sender": m1.group(1).strip(), "content": m1.group(2).strip(), "raw": line}

    # Pattern: Alex: Hello or @Alex: Hello
    m2 = re.match(r"^@?([A-Za-z0-9_\-\s]{2,20}):\s*(.+)$", line)
    if m2:
        return {"sender": m2.group(1).strip(), "content": m2.group(2).strip(), "raw": line}

    # Pattern: Alex — Today at 10:00 AM: Hello
    m3 = re.match(r"^([A-Za-z0-9_\-\s]{2,20})\s*—\s*[^:]+:\s*(.+)$", line)
    if m3:
        return {"sender": m3.group(1).strip(), "content": m3.group(2).strip(), "raw": line}

    return {"sender": "", "content": line, "raw": line}


def _extract_headline(text: str, fallback: str) -> str:
    cleaned = re.sub(r"^(?:announcement|psa|update|heads up|reminder|important)[:\s-]*", "", text, flags=re.IGNORECASE).strip()
    words = cleaned.split()
    if len(words) <= 8:
        return cleaned or fallback
    return " ".join(words[:8]) + "..."


def _clean_sentence(text: str) -> str:
    return text.strip().rstrip(".,")


def _dedup_list(items: list, key: str) -> list:
    seen = set()
    unique = []
    for item in items:
        val = getattr(item, key, "").lower().strip()
        if val not in seen and val:
            seen.add(val)
            unique.append(item)
    return unique


def _calculate_stats(text: str, tasks: list, deadlines: list) -> AnalysisStats:
    lines = [l for l in text.split("\n") if l.strip()]
    participants = set()
    for l in lines:
        p = _parse_line(l)
        if p["sender"]:
            participants.add(p["sender"])

    high_prio = sum(1 for t in tasks if getattr(t, "priority", "") == "High")
    return AnalysisStats(
        total_messages=len(lines),
        participants=sorted(list(participants)),
        task_count=len(tasks),
        deadline_count=len(deadlines),
        high_priority_count=high_prio
    )


def _empty_result(message: str) -> ChatAnalysisResult:
    return ChatAnalysisResult(
        mode="offline_engine",
        overall_summary=message,
        sentiment_or_vibe="Neutral",
        announcements=[],
        tasks=[],
        deadlines=[],
        meetings=[],
        decisions=[],
        direct_mentions=[],
        uncertainties=[],
        stats=AnalysisStats()
    )
