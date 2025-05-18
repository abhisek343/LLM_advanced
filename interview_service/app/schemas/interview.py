# LLM_interviewer/server/app/schemas/interview.py

from pydantic import BaseModel, Field, field_validator, ConfigDict 
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import uuid 

from .user import PyObjectIdStr 
from ..core.schema_utils import clean_model_title # Will be ..core.schema_utils

class QuestionBase(BaseModel):
    text: str = Field(..., description="The text of the interview question")
    category: str = Field(..., description="Category of the question (e.g., Behavioral, Technical)")
    difficulty: str = Field(..., description="Difficulty level (e.g., Easy, Medium, Hard)")
    question_id: Optional[str] = Field(None, description="Custom identifier for the question")

class QuestionCreate(QuestionBase):
    pass

class Question(QuestionBase):
    id: PyObjectIdStr = Field(..., alias="_id")
    created_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class QuestionOut(Question): 
    pass

class InterviewBase(BaseModel):
    candidate_id: PyObjectIdStr = Field(..., description="ID of the candidate")
    hr_id: PyObjectIdStr = Field(..., description="ID of the HR personnel who scheduled")
    job_title: str = Field(..., description="Job title for the interview")
    job_description: Optional[str] = Field(None, description="Job description")
    scheduled_time: Optional[datetime] = Field(None, description="Time the interview is scheduled for")
    status: str = Field("Scheduled", description="Status (e.g., Scheduled, In Progress, Completed, Evaluated)")

class InterviewCreate(BaseModel):
    candidate_id: PyObjectIdStr
    job_title: str
    job_description: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    role: str = Field(..., description="Role being interviewed for (e.g., Software Engineer)")
    tech_stack: List[str] = Field(default_factory=list, description="Relevant technical skills/stack")

    model_config = ConfigDict(
        json_schema_extra = {
            "example": {
                "candidate_id": "60d5ec49f72f3b5e9f1d0a1c",
                "job_title": "Senior Python Developer",
                "job_description": "Develop and maintain web applications.",
                "role": "Software Engineer",
                "tech_stack": ["python", "fastapi", "mongodb"]
            }
        }
    )

class Interview(InterviewBase):
    id: PyObjectIdStr = Field(..., alias="_id")
    interview_id: str = Field(..., description="Custom unique ID for the interview session") 
    questions: List[Dict[str, Any]] = Field(default_factory=list, description="List of generated questions embedded")
    created_at: datetime
    updated_at: Optional[datetime] = None
    overall_score: Optional[float] = Field(None, description="Overall score if calculated")
    overall_feedback: Optional[str] = Field(None, description="Overall feedback if provided")
    completed_at: Optional[datetime] = None 
    evaluated_by: Optional[str] = None 
    evaluated_at: Optional[datetime] = None 

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str} 
    )

class InterviewOut(InterviewBase): 
    id: PyObjectIdStr = Field(..., alias="_id") 
    interview_id: Optional[str] = Field(None, description="Custom interview identifier generated during creation")
    questions: Optional[List[QuestionBase]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None 
    overall_score: Optional[float] = None 
    overall_feedback: Optional[str] = None
    evaluated_by: Optional[str] = None 
    evaluated_at: Optional[datetime] = None 

    model_config = ConfigDict(
        from_attributes = True, 
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat() if dt else None} 
    )

class SingleResponseSubmit(BaseModel):
    interview_id: str = Field(..., description="The custom ID of the interview session")
    question_id: str = Field(..., description="The ID of the question being answered")
    answer: str = Field(..., min_length=1, description="The candidate's answer text") 

    model_config = ConfigDict(
         json_schema_extra={
             "example": {
                 "interview_id": "some_interview_uuid",
                 "question_id": "some_question_uuid",
                 "answer": "My detailed answer to this specific question."
            }
        }
    )

class AnswerItem(BaseModel):
    question_id: str
    answer_text: str 

    model_config = ConfigDict(
         json_schema_extra={
             "example": {"question_id": "q1_uuid", "answer_text": "My answer..."}
        }
    )

class SubmitAnswersRequest(BaseModel):
    interview_id: str 
    answers: List[AnswerItem] 

class InterviewResponseBase(BaseModel):
    interview_id: str
    question_id: str
    candidate_id: PyObjectIdStr
    answer: str 
    submitted_at: datetime

class InterviewResponse(InterviewResponseBase):
    id: PyObjectIdStr = Field(..., alias="_id")
    score: Optional[float] = Field(None, description="Score assigned by LLM or HR")
    feedback: Optional[str] = Field(None, description="Feedback provided during evaluation")
    evaluated_by: Optional[str] = None 
    evaluated_at: Optional[datetime] = None 

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat() if dt else None}
    )

class InterviewResponseOut(InterviewResponse):
    pass

class ResponseFeedbackItem(BaseModel):
    question_id: str
    score: Optional[float] = Field(None, ge=0, le=5)
    feedback: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"question_id": "q1_uuid", "score": 4.0, "feedback": "Good answer."}
        }
    )

class InterviewResultSubmit(BaseModel):
    overall_score: Optional[float] = Field(None, ge=0, le=5) 
    overall_feedback: Optional[str] = None
    responses_feedback: Optional[List[ResponseFeedbackItem]] = Field(None, description="Optional list of feedback per response")
    status: Optional[str] = Field(None, description="e.g., Evaluated") 

    model_config = ConfigDict(
         json_schema_extra={
             "example": {
                 "responses_feedback": [{"question_id": "q1_id", "score": 4.0, "feedback": "Good"}],
                 "overall_score": 4.0,
                 "overall_feedback": "Overall good."
             }
        }
    )

class InterviewResultOut(BaseModel):
    result_id: str 
    interview_id: str
    candidate_id: PyObjectIdStr
    total_score: Optional[float] = None 
    overall_feedback: Optional[str] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True, 
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat() if dt else None}
    )
