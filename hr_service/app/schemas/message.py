# LLM_interviewer/server/app/schemas/message.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

from .user import PyObjectIdStr 

class BaseUserInfo(BaseModel):
    id: PyObjectIdStr
    username: str
    
    model_config = ConfigDict(from_attributes=True)

class MessageBase(BaseModel):
    recipient_id: PyObjectIdStr = Field(..., description="ID of the message recipient")
    subject: Optional[str] = Field(
        None, max_length=200, description="Subject of the message"
    )
    content: str = Field(..., description="The content/body of the message")

class MessageCreate(MessageBase):
    pass

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "recipient_id": "6819421abecde9ce24f85d5b", 
                "subject": "Invitation to Proceed",
                "content": "We have reviewed your resume and would like to invite you to the next stage...",
            }
        }
    )

class MessageContentCreate(BaseModel):
    subject: Optional[str] = Field(None, max_length=200, description="Subject of the message")
    content: str = Field(..., description="The content/body of the message")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "subject": "Invitation to Proceed",
                "content": "We have reviewed your resume and would like to invite you to the next stage...",
            }
        }
    )

class MessageOut(MessageBase):
    id: PyObjectIdStr = Field(..., alias="_id") 
    sender_id: PyObjectIdStr 

    sent_at: datetime
    read_status: bool
    read_at: Optional[datetime] = None

    sender_info: Optional[BaseUserInfo] = Field(
        None, description="Basic info of the sender"
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={datetime: lambda dt: dt.isoformat() if dt else None},
    )

class MarkReadRequest(BaseModel):
    message_ids: List[PyObjectIdStr] = Field(
        ..., min_length=1, description="List of message IDs to mark as read"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message_ids": ["681cae4f5634b1e5b7c8d01a", "681cae4f5634b1e5b7c8d01b"]
            }
        }
    )
