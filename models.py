"""
Data models for the 'What Did I Miss?' application.
Defines strict Pydantic schemas for request payloads and structured AI responses.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """Input payload submitted by the user."""
    text: str = Field(..., description="The chat log or conversation content to analyze.")
    user_name: Optional[str] = Field(None, description="Optional name or username to track mentions.")
    api_key: Optional[str] = Field(None, description="Optional Gemini API key passed for custom execution.")


class TaskItem(BaseModel):
    task: str = Field(..., description="Description of the action item or task.")
    assignee: str = Field("Unassigned", description="Name of the person assigned, or 'Unassigned' if not mentioned.")
    deadline: str = Field("Not specified", description="Explicit deadline if given, else 'Not specified'.")
    priority: str = Field("Medium", description="Urgency: High, Medium, or Low.")
    status: str = Field("Pending", description="Status of the task (Pending, Completed).")


class DeadlineItem(BaseModel):
    title: str = Field(..., description="Milestone, event, or task associated with this deadline.")
    due_date: str = Field(..., description="Explicit date and/or time.")
    urgency: str = Field("Medium", description="Urgency rating: High, Medium, or Low.")
    related_to: str = Field("", description="Context or person responsible.")


class AnnouncementItem(BaseModel):
    title: str = Field(..., description="Concise headline of the announcement.")
    details: str = Field(..., description="Important details, changes, or alerts.")
    importance: str = Field("Medium", description="Importance level: High, Medium, or Low.")
    announced_by: str = Field("", description="Person who made the announcement, if stated.")


class MeetingItem(BaseModel):
    title: str = Field(..., description="Name or purpose of the meeting.")
    date_time: str = Field(..., description="When the meeting occurs (e.g. 'Today at 5:00 PM').")
    venue_or_link: str = Field("TBD", description="Location, Google Meet/Zoom link, or room number.")
    agenda: str = Field("", description="Key topics to discuss.")


class DecisionItem(BaseModel):
    decision: str = Field(..., description="The concrete decision or agreement reached.")
    context: str = Field("", description="Why this decision was made or alternative options considered.")
    agreed_by: str = Field("", description="Key participants involved in the agreement.")


class MentionItem(BaseModel):
    sender: str = Field(..., description="Person who mentioned the user.")
    message: str = Field(..., description="The exact or summarized quote containing the mention.")
    relevance: str = Field(..., description="Why this matters to the user.")
    priority: str = Field("Medium", description="High, Medium, or Low.")


class UncertaintyItem(BaseModel):
    topic: str = Field(..., description="The subject or question that was left unresolved.")
    missing_info: str = Field(..., description="What information is missing, pending, or unconfirmed.")


class AnalysisStats(BaseModel):
    total_messages: int = 0
    participants: List[str] = []
    task_count: int = 0
    deadline_count: int = 0
    high_priority_count: int = 0


class ChatAnalysisResult(BaseModel):
    """Structured response returned by the backend to the frontend UI."""
    mode: str = Field("offline_engine", description="'gemini' or 'offline_engine'")
    overall_summary: str = Field(..., description="A clear 2-4 sentence executive overview.")
    sentiment_or_vibe: str = Field("Focused & Collaborative", description="General tone of the discussion.")
    announcements: List[AnnouncementItem] = Field(default_factory=list)
    tasks: List[TaskItem] = Field(default_factory=list)
    deadlines: List[DeadlineItem] = Field(default_factory=list)
    meetings: List[MeetingItem] = Field(default_factory=list)
    decisions: List[DecisionItem] = Field(default_factory=list)
    direct_mentions: List[MentionItem] = Field(default_factory=list)
    uncertainties: List[UncertaintyItem] = Field(default_factory=list)
    stats: AnalysisStats = Field(default_factory=AnalysisStats)
