from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import string
import random as rand_module
from pathlib import Path
from datetime import datetime, timezone, timedelta
from google import genai
from google.genai import types as genai_types
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uuid
from passlib.context import CryptContext
from jose import JWTError, jwt
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_DAYS = int(os.environ.get('JWT_EXPIRATION_DAYS', 7))

security = HTTPBearer()

app = FastAPI(title="DebateIQ - AI Debate Judge Platform")
api_router = APIRouter(prefix="/api")

# ============= PYDANTIC MODELS =============

# --- Auth ---
class UserSignUp(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserSignIn(BaseModel):
    email: EmailStr
    password: str

# --- Debate ---
class CreateRoomRequest(BaseModel):
    topic: str
    sideALabel: Optional[str] = "Side A"
    sideBLabel: Optional[str] = "Side B"

class JoinRoomRequest(BaseModel):
    roomCode: str
    participantName: str

class AddTranscriptRequest(BaseModel):
    roomId: str
    participantName: str
    side: str
    message: str

class RoomActionRequest(BaseModel):
    roomId: str

class EvaluateRequest(BaseModel):
    roomId: str

# ============= UTILITY FUNCTIONS =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def generate_room_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return ''.join(rand_module.choices(chars, k=6))

# ============= AUTH ROUTES =============

@api_router.post("/auth/signup")
async def signup(user: UserSignUp):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return {"success": True, "message": "Account created successfully"}

@api_router.post("/auth/signin")
async def signin(user: UserSignIn):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": db_user["id"]})
    return {
        "success": True,
        "token": token,
        "user": {"id": db_user["id"], "name": db_user["name"], "email": db_user["email"]}
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"]}

@api_router.post("/auth/logout")
async def logout():
    return {"success": True, "message": "Logged out successfully"}

# ============= DEBATE ROOM ROUTES =============

@api_router.post("/debate/create-room")
async def create_room(data: CreateRoomRequest, current_user: dict = Depends(get_current_user)):
    room_id = str(uuid.uuid4())
    room_code = generate_room_code()
    while await db.debate_rooms.find_one({"roomCode": room_code}):
        room_code = generate_room_code()

    room_doc = {
        "id": room_id,
        "topic": data.topic,
        "roomCode": room_code,
        "sideALabel": data.sideALabel,
        "sideBLabel": data.sideBLabel,
        "createdBy": current_user["id"],
        "createdByName": current_user["name"],
        "participants": [{
            "userId": current_user["id"],
            "name": current_user["name"],
            "side": "A",
            "joinedAt": datetime.now(timezone.utc).isoformat()
        }],
        "status": "waiting",
        "evaluated": False,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.debate_rooms.insert_one(room_doc)
    return {"success": True, "roomId": room_id, "roomCode": room_code}

@api_router.post("/debate/join-room")
async def join_room(data: JoinRoomRequest, current_user: dict = Depends(get_current_user)):
    room = await db.debate_rooms.find_one({"roomCode": data.roomCode.upper().strip()}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found. Check your room code.")
    if room["status"] == "completed":
        raise HTTPException(status_code=400, detail="This debate has already ended.")

    # Check if Side B is already taken
    side_b_taken = any(p["side"] == "B" for p in room.get("participants", []))
    if side_b_taken:
        raise HTTPException(status_code=400, detail="Side B is already taken in this room.")

    # Check if current user already in room
    already_in = any(p["userId"] == current_user["id"] for p in room.get("participants", []))
    if already_in:
        return {"success": True, "roomId": room["id"]}

    participant = {
        "userId": current_user["id"],
        "name": data.participantName or current_user["name"],
        "side": "B",
        "joinedAt": datetime.now(timezone.utc).isoformat()
    }
    await db.debate_rooms.update_one({"id": room["id"]}, {"$push": {"participants": participant}})
    return {"success": True, "roomId": room["id"]}

@api_router.get("/debate/room/{room_id}")
async def get_room(room_id: str, current_user: dict = Depends(get_current_user)):
    room = await db.debate_rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@api_router.post("/debate/start-room")
async def start_room(data: RoomActionRequest, current_user: dict = Depends(get_current_user)):
    room = await db.debate_rooms.find_one({"id": data.roomId})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["createdBy"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the room creator can start the debate")
    await db.debate_rooms.update_one(
        {"id": data.roomId},
        {"$set": {
            "status": "live",
            "startedAt": datetime.now(timezone.utc).isoformat(),
            "currentTurn": "A",
            "turnsUsed": {"A": 0, "B": 0},
            "maxTurnsPerSide": 2
        }}
    )
    return {"success": True}

@api_router.post("/debate/end-room")
async def end_room(data: RoomActionRequest, current_user: dict = Depends(get_current_user)):
    room = await db.debate_rooms.find_one({"id": data.roomId})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["createdBy"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the room creator can end the debate")
    await db.debate_rooms.update_one(
        {"id": data.roomId},
        {"$set": {"status": "completed", "endedAt": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}

@api_router.get("/debate/my-rooms")
async def get_my_rooms(current_user: dict = Depends(get_current_user)):
    rooms = await db.debate_rooms.find(
        {"createdBy": current_user["id"]}, {"_id": 0}
    ).sort("createdAt", -1).to_list(50)
    return rooms

@api_router.get("/debate/public-rooms")
async def get_public_rooms(current_user: dict = Depends(get_current_user)):
    rooms = await db.debate_rooms.find(
        {"createdBy": {"$ne": current_user["id"]}}, {"_id": 0}
    ).sort("createdAt", -1).limit(20).to_list(20)
    return rooms

# ============= TRANSCRIPT ROUTES =============

@api_router.post("/debate/transcript/add")
async def add_transcript(data: AddTranscriptRequest, current_user: dict = Depends(get_current_user)):
    room = await db.debate_rooms.find_one({"id": data.roomId})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["status"] != "live":
        raise HTTPException(status_code=400, detail="Debate is not live. Cannot submit statements.")

    # --- Turn-based enforcement ---
    current_turn = room.get("currentTurn", "A")
    turns_used = room.get("turnsUsed", {"A": 0, "B": 0})
    max_turns = room.get("maxTurnsPerSide", 2)
    speaker_side = data.side.upper()

    if speaker_side != current_turn:
        other = "Side A" if current_turn == "A" else "Side B"
        raise HTTPException(
            status_code=400,
            detail=f"It is not your turn. Please wait for {other} to finish speaking."
        )

    if turns_used.get(speaker_side, 0) >= max_turns:
        raise HTTPException(
            status_code=400,
            detail=f"You have used all your {max_turns} chances."
        )

    # Insert transcript entry
    entry = {
        "id": str(uuid.uuid4()),
        "roomId": data.roomId,
        "participantId": current_user["id"],
        "participantName": data.participantName or current_user["name"],
        "side": speaker_side,
        "message": data.message.strip(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.debate_transcripts.insert_one(entry)

    # Update turns used
    new_turns_used = dict(turns_used)
    new_turns_used[speaker_side] = new_turns_used.get(speaker_side, 0) + 1

    # Determine next turn (alternate sides)
    next_turn = "B" if speaker_side == "A" else "A"

    # Check if debate is fully complete (both sides used all turns)
    a_done = new_turns_used.get("A", 0) >= max_turns
    b_done = new_turns_used.get("B", 0) >= max_turns
    debate_complete = a_done and b_done

    update_fields = {
        "turnsUsed": new_turns_used,
        "currentTurn": next_turn
    }

    if debate_complete:
        update_fields["status"] = "completed"
        update_fields["endedAt"] = datetime.now(timezone.utc).isoformat()

    await db.debate_rooms.update_one(
        {"id": data.roomId},
        {"$set": update_fields}
    )

    # Auto-trigger AI evaluation when debate is complete
    auto_evaluated = False
    if debate_complete:
        try:
            transcripts = await db.debate_transcripts.find(
                {"roomId": data.roomId}, {"_id": 0}
            ).sort("timestamp", 1).to_list(2000)

            sideA_entries = [t for t in transcripts if t["side"] == "A"]
            sideB_entries = [t for t in transcripts if t["side"] == "B"]
            sideA_label = room.get("sideALabel", "Side A")
            sideB_label = room.get("sideBLabel", "Side B")

            def fmt(entries, label):
                if not entries:
                    return f"[{label} did not speak]"
                return "\n".join([f"[{e['participantName']}]: {e['message']}" for e in entries])

            prompt = DEBATE_JUDGE_PROMPT.format(
                topic=room["topic"],
                sideALabel=sideA_label,
                sideBLabel=sideB_label,
                sideA_transcript=fmt(sideA_entries, sideA_label),
                sideB_transcript=fmt(sideB_entries, sideB_label)
            )

            gemini_client = genai.Client(api_key=os.environ.get('GOOGLE_GEMINI_API_KEY'))
            response = await gemini_client.aio.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction="You are a neutral AI debate judge. Return only valid JSON exactly as instructed."
                )
            )
            raw = response.text.strip()
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.startswith("```"):
                raw = raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()
            result = json.loads(raw)

            eval_id = str(uuid.uuid4())
            eval_doc = {
                "id": eval_id,
                "roomId": data.roomId,
                "topic": room["topic"],
                "sideALabel": sideA_label,
                "sideBLabel": sideB_label,
                "sideA": result.get("sideA", {}),
                "sideB": result.get("sideB", {}),
                "winner": result.get("winner", ""),
                "reason": result.get("reason", ""),
                "finalVerdict": result.get("final_verdict", ""),
                "transcriptCount": len(transcripts),
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.debate_feedback.update_one(
                {"roomId": data.roomId}, {"$set": eval_doc}, upsert=True
            )
            await db.debate_rooms.update_one(
                {"id": data.roomId},
                {"$set": {"evaluated": True, "evaluationId": eval_id}}
            )
            auto_evaluated = True
        except Exception as e:
            logging.error(f"Auto-evaluation error: {str(e)}")

    return {
        "success": True,
        "entryId": entry["id"],
        "nextTurn": next_turn,
        "turnsUsed": new_turns_used,
        "debateComplete": debate_complete,
        "autoEvaluated": auto_evaluated
    }

@api_router.get("/debate/transcripts/{room_id}")
async def get_transcripts(room_id: str, current_user: dict = Depends(get_current_user)):
    entries = await db.debate_transcripts.find(
        {"roomId": room_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(2000)
    return entries

# ============= AI EVALUATION =============

DEBATE_JUDGE_PROMPT = """You are a neutral third-party AI judge in a two-person debate.

STRICT RULES:

PHASE 1 — LISTENING
- Do NOT interrupt.
- Do NOT give opinions.
- Do NOT give hints.
- Do NOT judge early.
- Only observe arguments, logic, contradictions, rebuttals, clarity, and evidence.

PHASE 2 — COMPLETION DETECTION
- The debate is now complete as explicitly indicated by the host.

PHASE 3 — JUDGMENT
After completion, analyze both sides fairly.

Evaluation Criteria:
- Logical reasoning
- Clarity
- Consistency
- Evidence quality
- Counter-arguments
- Contradictions
- Overall persuasion

IMPORTANT:
- Be unbiased.
- Do not try to satisfy both sides.
- Choose a clear winner if one side is stronger.
- Declare a tie ONLY if both sides are equally strong.
- Call out weak logic and fallacies directly.
- Keep explanations concise and professional.

DEBATE TOPIC: {topic}

{sideALabel} ARGUMENTS:
{sideA_transcript}

{sideBLabel} ARGUMENTS:
{sideB_transcript}

OUTPUT FORMAT (STRICT JSON — return ONLY this JSON, no markdown, no extra text):

{{
  "sideA": {{
    "summary": "",
    "strengths": [],
    "weaknesses": [],
    "score": 0
  }},
  "sideB": {{
    "summary": "",
    "strengths": [],
    "weaknesses": [],
    "score": 0
  }},
  "winner": "Side A / Side B / Tie",
  "reason": "",
  "final_verdict": ""
}}

Scores are integers from 0 to 100."""


@api_router.post("/debate/evaluate")
async def evaluate_debate(data: EvaluateRequest, current_user: dict = Depends(get_current_user)):
    try:
        room = await db.debate_rooms.find_one({"id": data.roomId}, {"_id": 0})
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room["createdBy"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Only the room creator can trigger evaluation")

        transcripts = await db.debate_transcripts.find(
            {"roomId": data.roomId}, {"_id": 0}
        ).sort("timestamp", 1).to_list(2000)

        if not transcripts:
            raise HTTPException(status_code=400, detail="No transcript entries found for this room")

        sideA_entries = [t for t in transcripts if t["side"] == "A"]
        sideB_entries = [t for t in transcripts if t["side"] == "B"]

        sideA_label = room.get("sideALabel", "Side A")
        sideB_label = room.get("sideBLabel", "Side B")

        def fmt(entries, label):
            if not entries:
                return f"[{label} did not speak]"
            return "\n".join([f"[{e['participantName']}]: {e['message']}" for e in entries])

        prompt = DEBATE_JUDGE_PROMPT.format(
            topic=room["topic"],
            sideALabel=sideA_label,
            sideBLabel=sideB_label,
            sideA_transcript=fmt(sideA_entries, sideA_label),
            sideB_transcript=fmt(sideB_entries, sideB_label)
        )

        gemini_client = genai.Client(api_key=os.environ.get('GOOGLE_GEMINI_API_KEY'))
        response = await gemini_client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                system_instruction="You are a neutral AI debate judge. Return only valid JSON exactly as instructed."
            )
        )
        raw = response.text.strip()

        # Strip markdown blocks if present
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        result = json.loads(raw)

        eval_id = str(uuid.uuid4())
        eval_doc = {
            "id": eval_id,
            "roomId": data.roomId,
            "topic": room["topic"],
            "sideALabel": sideA_label,
            "sideBLabel": sideB_label,
            "sideA": result.get("sideA", {}),
            "sideB": result.get("sideB", {}),
            "winner": result.get("winner", ""),
            "reason": result.get("reason", ""),
            "finalVerdict": result.get("final_verdict", ""),
            "transcriptCount": len(transcripts),
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await db.debate_feedback.update_one(
            {"roomId": data.roomId}, {"$set": eval_doc}, upsert=True
        )
        await db.debate_rooms.update_one(
            {"id": data.roomId},
            {"$set": {"evaluated": True, "evaluationId": eval_id}}
        )
        return {"success": True, "evaluationId": eval_id, "result": result}

    except json.JSONDecodeError as e:
        logging.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON. Please try again.")
    except Exception as e:
        logging.error(f"Evaluation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/debate/feedback/{room_id}")
async def get_feedback(room_id: str, current_user: dict = Depends(get_current_user)):
    fb = await db.debate_feedback.find_one({"roomId": room_id}, {"_id": 0})
    if not fb:
        return None
    return fb


@api_router.get("/debate/results/{room_id}")
async def get_results(room_id: str, current_user: dict = Depends(get_current_user)):
    fb = await db.debate_feedback.find_one({"roomId": room_id}, {"_id": 0})
    if not fb:
        raise HTTPException(status_code=404, detail="Results not available yet. Run evaluation first.")
    room = await db.debate_rooms.find_one({"id": room_id}, {"_id": 0})
    return {
        "room": room,
        "feedback": fb,
        "leaderboard": [
            {
                "side": "A",
                "label": fb.get("sideALabel", "Side A"),
                "score": fb.get("sideA", {}).get("score", 0),
                "isWinner": "Side A" in fb.get("winner", "")
            },
            {
                "side": "B",
                "label": fb.get("sideBLabel", "Side B"),
                "score": fb.get("sideB", {}).get("score", 0),
                "isWinner": "Side B" in fb.get("winner", "")
            }
        ]
    }

# ============= BASIC ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "DebateIQ API - AI Debate Judge Platform"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
