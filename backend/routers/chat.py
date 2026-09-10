from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession

from backend.config import OPENROUTER_MODEL_DEFAULT
from backend.database import get_db
from backend.models import ChatMessage
from backend.models.session import Session
from backend.routers.auth import get_current_user
from backend.models.user import User
from backend.schemas.chat import ChatRequest, ChatResponse
from backend.services.openrouter import OpenRouterConfigError, generate_reply, stream_reply


router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


def _get_or_create_session(db: DBSession, session_id: int | None, user: User) -> Session:
    """Resolve the session: use existing one or create a new one for the user."""
    if session_id is not None:
        session = db.query(Session).filter(Session.id == session_id, Session.user_id == user.id).first()
        if session is None:
            raise HTTPException(status_code=404, detail="Sessao nao encontrada.")
        return session
    # Create a new session automatically
    session = Session(user_id=user.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _auto_title(user_message: str) -> str:
    """Use the full first user message as the session title."""
    cleaned = user_message.strip()
    if not cleaned:
        return "Nova sessao"
    # Use the first line as the title (full, no truncation)
    return cleaned.split("\n")[0].strip() or "Nova sessao"


@router.post("/api/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> ChatResponse:
    session = _get_or_create_session(db, payload.session_id, current_user)
    resolved_model = payload.model or OPENROUTER_MODEL_DEFAULT

    # Auto-title and save first user message BEFORE the API call
    if not session.title:
        session.title = _auto_title(payload.message)
    existing_user_msgs = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id,
        ChatMessage.role == "user"
    ).count()
    if existing_user_msgs == 0:
        db.add(ChatMessage(session_id=session.id, session_key="default", role="user", content=payload.message, model=resolved_model))
    db.commit()

    try:
        reply, model_name = await generate_reply(
            user_message=payload.message,
            history=[item.model_dump() for item in payload.history],
            model=payload.model,
        )
    except OpenRouterConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return ChatResponse(reply=reply, model=resolved_model)


@router.post("/api/chat/stream")
async def chat_stream(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> StreamingResponse:
    session = _get_or_create_session(db, payload.session_id, current_user)
    resolved_model = payload.model or OPENROUTER_MODEL_DEFAULT

    # Auto-title and save first user message BEFORE streaming
    if not session.title:
        session.title = _auto_title(payload.message)
    existing_user_msgs = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id,
        ChatMessage.role == "user"
    ).count()
    if existing_user_msgs == 0:
        db.add(
            ChatMessage(
                session_id=session.id,
                session_key="default",
                role="user",
                content=payload.message,
                model=resolved_model,
            )
        )
    db.commit()

    async def event_generator():
        nonlocal session
        full_reply = ""
        try:
            async for delta in stream_reply(
                user_message=payload.message,
                history=[item.model_dump() for item in payload.history],
                model=payload.model,
            ):
                full_reply += delta
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=True)}\n\n"
        except OpenRouterConfigError as exc:
            yield f"data: {json.dumps({'error': str(exc), 'done': True, 'session_id': session.id}, ensure_ascii=True)}\n\n"
            return
        except RuntimeError as exc:
            yield f"data: {json.dumps({'error': str(exc), 'done': True, 'session_id': session.id}, ensure_ascii=True)}\n\n"
            return

        yield f"data: {json.dumps({'done': True, 'session_id': session.id}, ensure_ascii=True)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
