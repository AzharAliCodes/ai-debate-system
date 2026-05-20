from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
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
from typing import List, Optional, Dict, Set
import uuid
from passlib.context import CryptContext
from jose import JWTError, jwt
import json
import anyio
import aiofiles
import pyttsx3
from gtts import gTTS
import threading

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

# Create static directories
os.makedirs(ROOT_DIR / "static" / "audio", exist_ok=True)

# Initialize Faster Whisper with fallback for system DLL load blocks
whisper_model = None
try:
    from faster_whisper import WhisperModel
    logging.info("Initializing Faster Whisper base model on CPU...")
    try:
        whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    except Exception as e:
        logging.warning(f"Failed to load Whisper base with int8: {e}. Trying float32...")
        try:
            whisper_model = WhisperModel("base", device="cpu", compute_type="float32")
        except Exception as e2:
            logging.error(f"Failed to load Whisper base with float32: {e2}")
except Exception as e:
    logging.error(f"Failed to import or initialize WhisperModel (Application Control Policy might be blocking ctranslate2 DLLs): {e}")

# ============= WEBSOCKET MANAGER =============

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        self.active_connections[room_id].add(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id in self.active_connections:
            self.active_connections[room_id].discard(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, room_id: str, message: dict):
        if room_id in self.active_connections:
            for connection in list(self.active_connections[room_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    self.disconnect(room_id, connection)

manager = ConnectionManager()

# ============= PYDANTIC MODELS =============

class UserSignUp(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserSignIn(BaseModel):
    email: EmailStr
    password: str

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

class MicActionRequest(BaseModel):
    roomId: str
    side: str
    participantName: str

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

def transcribe_audio(audio_path: str) -> str:
    if whisper_model is None:
        logging.warning("Whisper model is not initialized. Skipping local transcription.")
        return ""
    segments, info = whisper_model.transcribe(audio_path)
    full_text = ""
    for segment in segments:
        full_text += segment.text + " "
    return full_text.strip()

def generate_tts_sync(text: str, output_path: str):
    try:
        logging.info(f"Generating TTS using pyttsx3 for text: {text[:50]}")
        engine = pyttsx3.init()
        engine.save_to_file(text, output_path)
        engine.runAndWait()
        del engine
    except Exception as e:
        logging.error(f"pyttsx3 failed: {e}. Falling back to gTTS...")
        try:
            # Fallback to gTTS (Google TTS)
            tts = gTTS(text=text, lang='en')
            # Save it as .mp3 but we rename it or keep it .mp3
            mp3_path = output_path.replace(".wav", ".mp3")
            tts.save(mp3_path)
        except Exception as ge:
            logging.error(f"gTTS fallback also failed: {ge}")

async def generate_tts_audio(text: str, output_path: str):
    await anyio.to_thread.run_sync(generate_tts_sync, text, output_path)

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
        "micHolder": None,
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
    # Broadcast to room so Person A sees the new participant in real-time
    await manager.broadcast(room["id"], {
        "type": "state_update",
        "status": room.get("status", "waiting")
    })
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
            "maxTurnsPerSide": 5,
            "micHolder": None
        }}
    )
    # Broadcast start
    await manager.broadcast(data.roomId, {
        "type": "state_update",
        "micHolder": None,
        "turnsUsed": {"A": 0, "B": 0},
        "status": "live"
    })
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
        {"$set": {"status": "completed", "endedAt": datetime.now(timezone.utc).isoformat(), "micHolder": None}}
    )
    # Broadcast end
    await manager.broadcast(data.roomId, {
        "type": "state_update",
        "micHolder": None,
        "status": "completed"
    })
    return {"success": True}

@api_router.get("/debate/my-rooms")
async def get_my_rooms(current_user: dict = Depends(get_current_user)):
    rooms = await db.debate_rooms.find(
        {"$or": [
            {"createdBy": current_user["id"]},
            {"participants.userId": current_user["id"]}
        ]}, {"_id": 0}
    ).sort("createdAt", -1).to_list(50)
    return rooms

@api_router.get("/debate/public-rooms")
async def get_public_rooms(current_user: dict = Depends(get_current_user)):
    rooms = await db.debate_rooms.find(
        {"createdBy": {"$ne": current_user["id"]}, "participants.userId": {"$ne": current_user["id"]}}, {"_id": 0}
    ).sort("createdAt", -1).limit(20).to_list(20)
    return rooms

# ============= MIC CONTROL API =============

@api_router.post("/debate/mic/acquire")
async def acquire_mic(data: MicActionRequest, current_user: dict = Depends(get_current_user)):
    room = await db.debate_rooms.find_one({"id": data.roomId})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["status"] != "live":
        raise HTTPException(status_code=400, detail="Debate is not live.")
    
    current_holder = room.get("micHolder")
    if current_holder and current_holder != data.side:
        raise HTTPException(status_code=400, detail="Microphone is currently locked by the other participant.")
        
    turns_used = room.get("turnsUsed", {"A": 0, "B": 0})
    max_turns = room.get("maxTurnsPerSide", 5)
    if turns_used.get(data.side, 0) >= max_turns:
        raise HTTPException(status_code=400, detail="You have exhausted all your speaking turns.")

    await db.debate_rooms.update_one(
        {"id": data.roomId},
        {"$set": {"micHolder": data.side}}
    )
    
    await manager.broadcast(data.roomId, {
        "type": "mic_update",
        "micHolder": data.side,
        "turnsUsed": turns_used,
        "status": "live"
    })
    return {"success": True}

@api_router.post("/debate/mic/release")
async def release_mic(data: MicActionRequest, current_user: dict = Depends(get_current_user)):
    room = await db.debate_rooms.find_one({"id": data.roomId})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    await db.debate_rooms.update_one(
        {"id": data.roomId},
        {"$set": {"micHolder": None}}
    )
    
    turns_used = room.get("turnsUsed", {"A": 0, "B": 0})
    await manager.broadcast(data.roomId, {
        "type": "mic_update",
        "micHolder": None,
        "turnsUsed": turns_used,
        "status": room.get("status", "live")
    })
    return {"success": True}

# ============= TRANSCRIPT AND AUDIO SERVICE =============

@api_router.post("/debate/audio/upload")
async def upload_audio(
    roomId: str = Form(...),
    participantName: str = Form(...),
    side: str = Form(...),
    textFallback: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    room = await db.debate_rooms.find_one({"id": roomId})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["status"] != "live":
        raise HTTPException(status_code=400, detail="Debate is not live.")

    turns_used = room.get("turnsUsed", {"A": 0, "B": 0})
    max_turns = room.get("maxTurnsPerSide", 5)
    speaker_side = side.upper()

    if turns_used.get(speaker_side, 0) >= max_turns:
        raise HTTPException(status_code=400, detail="You have exhausted all your speaking turns.")

    # Save audio temporarily
    audio_dir = ROOT_DIR / "static" / "audio"
    os.makedirs(audio_dir, exist_ok=True)
    temp_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] or ".wav"
    temp_path = audio_dir / f"temp_{temp_id}{ext}"

    async with aiofiles.open(temp_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            await f.write(chunk)

    # Convert voice/audio to text using Python Speech-To-Text (faster-whisper)
    try:
        text = await anyio.to_thread.run_sync(transcribe_audio, str(temp_path))
    except Exception as e:
        logging.error(f"Speech conversion failed: {e}")
        text = ""
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass

    text = text.strip()
    if not text:
        # Fallback to frontend Web Speech transcription text if provided
        if textFallback:
            text = textFallback.strip()
        else:
            text = "[Audio input detected, transcription empty]"

    # Insert transcript entry
    entry = {
        "id": str(uuid.uuid4()),
        "roomId": roomId,
        "participantId": current_user["id"],
        "participantName": participantName or current_user["name"],
        "side": speaker_side,
        "message": text,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.debate_transcripts.insert_one(entry)

    # Update turns used
    new_turns_used = dict(turns_used)
    new_turns_used[speaker_side] = new_turns_used.get(speaker_side, 0) + 1

    # Check if debate is fully complete (both sides finished 5 turns)
    a_done = new_turns_used.get("A", 0) >= max_turns
    b_done = new_turns_used.get("B", 0) >= max_turns
    debate_complete = a_done and b_done

    update_fields = {
        "turnsUsed": new_turns_used,
        "micHolder": None
    }

    if debate_complete:
        update_fields["status"] = "completed"
        update_fields["endedAt"] = datetime.now(timezone.utc).isoformat()

    await db.debate_rooms.update_one(
        {"id": roomId},
        {"$set": update_fields}
    )

    # Broadcast state update to WebSocket
    await manager.broadcast(roomId, {
        "type": "state_update",
        "micHolder": None,
        "turnsUsed": new_turns_used,
        "status": "completed" if debate_complete else "live"
    })

    # Trigger auto-evaluation if complete
    auto_evaluated = False
    if debate_complete:
        try:
            await run_ai_evaluation(roomId, room)
            auto_evaluated = True
        except Exception as e:
            logging.error(f"Auto-evaluation error: {str(e)}")

    return {
        "success": True,
        "entryId": entry["id"],
        "transcribedText": text,
        "turnsUsed": new_turns_used,
        "debateComplete": debate_complete,
        "autoEvaluated": auto_evaluated
    }

@api_router.post("/debate/transcript/add")
async def add_transcript(data: AddTranscriptRequest, current_user: dict = Depends(get_current_user)):
    room = await db.debate_rooms.find_one({"id": data.roomId})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["status"] != "live":
        raise HTTPException(status_code=400, detail="Debate is not live.")

    turns_used = room.get("turnsUsed", {"A": 0, "B": 0})
    max_turns = room.get("maxTurnsPerSide", 5)
    speaker_side = data.side.upper()

    if turns_used.get(speaker_side, 0) >= max_turns:
        raise HTTPException(status_code=400, detail=f"You have used all your {max_turns} chances.")

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

    a_done = new_turns_used.get("A", 0) >= max_turns
    b_done = new_turns_used.get("B", 0) >= max_turns
    debate_complete = a_done and b_done

    update_fields = {
        "turnsUsed": new_turns_used,
        "micHolder": None
    }

    if debate_complete:
        update_fields["status"] = "completed"
        update_fields["endedAt"] = datetime.now(timezone.utc).isoformat()

    await db.debate_rooms.update_one(
        {"id": data.roomId},
        {"$set": update_fields}
    )

    # Broadcast state update to WebSocket
    await manager.broadcast(data.roomId, {
        "type": "state_update",
        "micHolder": None,
        "turnsUsed": new_turns_used,
        "status": "completed" if debate_complete else "live"
    })

    auto_evaluated = False
    if debate_complete:
        try:
            await run_ai_evaluation(data.roomId, room)
            auto_evaluated = True
        except Exception as e:
            logging.error(f"Auto-evaluation error: {str(e)}")

    return {
        "success": True,
        "entryId": entry["id"],
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

# ============= WAPI AI JUDGE INTEGRATION =============

DEBATE_JUDGE_PROMPT = """You are a neutral third-party AI debate judge.
Analyze the following debate topic and transcripts for the two participants.

DEBATE TOPIC: {topic}

PARTICIPANTS:
Side A: {participantA} ({sideALabel})
Side B: {participantB} ({sideBLabel})

TRANSCRIPT:
{transcript_text}

You must evaluate both participants.
Calculate:
1. winner: The participant's name (e.g. "{participantA}" or "{participantB}") or "Tie".
2. scores: Out of 10 (integer) for each participant.
3. communication_quality: Out of 10 (integer) for each participant.
4. argument_strength: Out of 10 (integer) for each participant.
5. logical_consistency: Out of 10 (integer) for each participant.
6. confidence level: percentage (integer, 0 to 100).
7. reasoning: a summary explaining the winner, score rationale, and details of argument strength and communication quality.

STRICT RULE: You must return ONLY a valid JSON object matching the following format exactly. Do not include markdown code blocks, do not include any extra text.

Response format:
{{
  "winner": "{participantA}",
  "scores": {{
    "{participantA}": 9,
    "{participantB}": 7
  }},
  "communication_quality": {{
    "{participantA}": 8,
    "{participantB}": 7
  }},
  "argument_strength": {{
    "{participantA}": 9,
    "{participantB}": 6
  }},
  "logical_consistency": {{
    "{participantA}": 8,
    "{participantB}": 7
  }},
  "reasoning": "Ali presented stronger logical arguments with better rebuttals and clearer communication.",
  "confidence": 92
}}
"""

async def run_ai_evaluation(roomId: str, room: dict):
    transcripts = await db.debate_transcripts.find(
        {"roomId": roomId}, {"_id": 0}
    ).sort("timestamp", 1).to_list(2000)

    participants = room.get("participants", [])
    partA = next((p for p in participants if p["side"] == "A"), None)
    partB = next((p for p in participants if p["side"] == "B"), None)

    nameA = partA["name"] if partA else "Side A"
    nameB = partB["name"] if partB else "Side B"

    def fmt(entries, name):
        if not entries:
            return f"[{name} did not speak]"
        return "\n".join([f"[{e['participantName']}]: {e['message']}" for e in entries])

    sideA_entries = [t for t in transcripts if t["side"] == "A"]
    sideB_entries = [t for t in transcripts if t["side"] == "B"]

    transcript_text = fmt(sideA_entries, nameA) + "\n\n" + fmt(sideB_entries, nameB)

    prompt = DEBATE_JUDGE_PROMPT.format(
        topic=room["topic"],
        participantA=nameA,
        participantB=nameB,
        sideALabel=room.get("sideALabel", "Side A"),
        sideBLabel=room.get("sideBLabel", "Side B"),
        transcript_text=transcript_text
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

    # Convert AI Reasoning text into voice/audio
    reasoning_text = result.get("reasoning", "")
    audio_filename = f"{roomId}_result.wav"
    audio_path = ROOT_DIR / "static" / "audio" / audio_filename

    await generate_tts_audio(reasoning_text, str(audio_path))

    # Check if pyttsx3 or gtts saved as .mp3
    audio_relative_path = f"/static/audio/{audio_filename}"
    if not os.path.exists(audio_path) and os.path.exists(str(audio_path).replace(".wav", ".mp3")):
        audio_relative_path = f"/static/audio/{roomId}_result.mp3"

    eval_id = str(uuid.uuid4())
    eval_doc = {
        "id": eval_id,
        "roomId": roomId,
        "topic": room["topic"],
        "winner": result.get("winner", ""),
        "scores": result.get("scores", {}),
        "communication_quality": result.get("communication_quality", {}),
        "argument_strength": result.get("argument_strength", {}),
        "logical_consistency": result.get("logical_consistency", {}),
        "reasoning": result.get("reasoning", ""),
        "confidence": result.get("confidence", 100),
        "audioPath": audio_relative_path,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }

    await db.debate_feedback.update_one(
        {"roomId": roomId}, {"$set": eval_doc}, upsert=True
    )

    await db.debate_rooms.update_one(
        {"id": roomId},
        {"$set": {"evaluated": True, "evaluationId": eval_id}}
    )

    # Broadcast evaluated state to room clients
    await manager.broadcast(roomId, {
        "type": "state_update",
        "status": "completed",
        "evaluated": True,
        "evaluationId": eval_id
    })

@api_router.post("/debate/evaluate")
async def evaluate_debate(data: EvaluateRequest, current_user: dict = Depends(get_current_user)):
    try:
        room = await db.debate_rooms.find_one({"id": data.roomId}, {"_id": 0})
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room["createdBy"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Only the room creator can trigger evaluation")

        await run_ai_evaluation(data.roomId, room)
        fb = await db.debate_feedback.find_one({"roomId": data.roomId}, {"_id": 0})
        return {"success": True, "evaluationId": fb["id"], "result": fb}
    except Exception as e:
        logging.error(f"Evaluation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/debate/feedback/{room_id}")
async def get_feedback(room_id: str, current_user: dict = Depends(get_current_user)):
    fb = await db.debate_feedback.find_one({"roomId": room_id}, {"_id": 0})
    return fb

@api_router.get("/debate/results/{room_id}")
async def get_results(room_id: str, current_user: dict = Depends(get_current_user)):
    fb = await db.debate_feedback.find_one({"roomId": room_id}, {"_id": 0})
    if not fb:
        raise HTTPException(status_code=404, detail="Results not available yet. Run evaluation first.")
    room = await db.debate_rooms.find_one({"id": room_id}, {"_id": 0})
    
    participants = room.get("participants", [])
    partA = next((p for p in participants if p["side"] == "A"), None)
    partB = next((p for p in participants if p["side"] == "B"), None)

    nameA = partA["name"] if partA else "Side A"
    nameB = partB["name"] if partB else "Side B"

    scores = fb.get("scores", {})
    scoreA = scores.get(nameA, scores.get("Side A", 0))
    scoreB = scores.get(nameB, scores.get("Side B", 0))

    winner = fb.get("winner", "")

    return {
        "room": room,
        "feedback": fb,
        "leaderboard": [
            {
                "side": "A",
                "label": room.get("sideALabel", "Side A"),
                "name": nameA,
                "score": scoreA,
                "isWinner": nameA == winner or winner == "Side A"
            },
            {
                "side": "B",
                "label": room.get("sideBLabel", "Side B"),
                "name": nameB,
                "score": scoreB,
                "isWinner": nameB == winner or winner == "Side B"
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

# Mount Static serving
app.mount("/static", StaticFiles(directory=str(ROOT_DIR / "static")), name="static")

# WebSocket Endpoint
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)

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
