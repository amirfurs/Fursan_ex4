from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import base64
import jwt
from passlib.context import CryptContext
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    full_name: str
    hashed_password: str
    profile_picture: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    profile_picture: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    full_name: str
    profile_picture: Optional[str] = None
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class Section(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SectionCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Article(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    author: str
    section_id: str
    image_data: Optional[str] = None
    image_name: Optional[str] = None
    likes_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ArticleCreate(BaseModel):
    title: str
    content: str
    author: str
    section_id: str
    image_data: Optional[str] = None
    image_name: Optional[str] = None

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    author: Optional[str] = None
    section_id: Optional[str] = None
    image_data: Optional[str] = None
    image_name: Optional[str] = None

class ArticleResponse(BaseModel):
    id: str
    title: str
    content: str
    author: str
    section_id: str
    image_data: Optional[str] = None
    image_name: Optional[str] = None
    likes_count: int = 0
    created_at: datetime
    updated_at: datetime
    is_liked: Optional[bool] = None  # Whether current user liked this article

class Like(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    article_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# User Authentication Endpoints
@api_router.post("/register", response_model=Token)
async def register_user(user: UserCreate):
    # Check if username or email already exists
    existing_user = await db.users.find_one({
        "$or": [
            {"username": user.username},
            {"email": user.email}
        ]
    })
    if existing_user:
        if existing_user["username"] == user.username:
            raise HTTPException(status_code=400, detail="Username already registered")
        else:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict.pop("password")
    user_dict["hashed_password"] = hashed_password
    user_obj = User(**user_dict)
    
    await db.users.insert_one(user_obj.dict())
    
    # Create access token
    access_token = create_access_token(data={"sub": user_obj.id})
    user_response = UserResponse(**user_obj.dict())
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin):
    user = await db.users.find_one({"username": user_credentials.username})
    if not user or not verify_password(user_credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    if not user["is_active"]:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_response = UserResponse(**user)
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.get("/profile", response_model=UserResponse)
async def get_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.dict())

@api_router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    full_name: Optional[str] = None,
    profile_picture: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    update_data = {}
    if full_name is not None:
        update_data["full_name"] = full_name
    if profile_picture is not None:
        update_data["profile_picture"] = profile_picture
    
    if update_data:
        await db.users.update_one({"id": current_user.id}, {"$set": update_data})
        updated_user = await db.users.find_one({"id": current_user.id})
        return UserResponse(**updated_user)
    
    return UserResponse(**current_user.dict())

# Article Like Endpoints
@api_router.post("/articles/{article_id}/like")
async def like_article(article_id: str, current_user: User = Depends(get_current_user)):
    # Check if article exists
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Check if user already liked this article
    existing_like = await db.likes.find_one({
        "user_id": current_user.id,
        "article_id": article_id
    })
    
    if existing_like:
        raise HTTPException(status_code=400, detail="Article already liked")
    
    # Create like
    like = Like(user_id=current_user.id, article_id=article_id)
    await db.likes.insert_one(like.dict())
    
    # Update article likes count
    await db.articles.update_one(
        {"id": article_id},
        {"$inc": {"likes_count": 1}}
    )
    
    return {"message": "Article liked successfully"}

@api_router.delete("/articles/{article_id}/like")
async def unlike_article(article_id: str, current_user: User = Depends(get_current_user)):
    # Check if article exists
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Check if user liked this article
    existing_like = await db.likes.find_one({
        "user_id": current_user.id,
        "article_id": article_id
    })
    
    if not existing_like:
        raise HTTPException(status_code=400, detail="Article not liked yet")
    
    # Remove like
    await db.likes.delete_one({
        "user_id": current_user.id,
        "article_id": article_id
    })
    
    # Update article likes count
    await db.articles.update_one(
        {"id": article_id},
        {"$inc": {"likes_count": -1}}
    )
    
    return {"message": "Article unliked successfully"}

# Helper function to check if user liked an article
async def get_article_with_like_status(article, user_id=None):
    article_dict = article
    if user_id:
        like = await db.likes.find_one({
            "user_id": user_id,
            "article_id": article["id"]
        })
        article_dict["is_liked"] = like is not None
    else:
        article_dict["is_liked"] = None
    return ArticleResponse(**article_dict)

# Section endpoints
@api_router.post("/sections", response_model=Section)
async def create_section(section: SectionCreate):
    section_dict = section.dict()
    section_obj = Section(**section_dict)
    await db.sections.insert_one(section_obj.dict())
    return section_obj

@api_router.get("/sections", response_model=List[Section])
async def get_sections():
    sections = await db.sections.find().to_list(1000)
    return [Section(**section) for section in sections]

@api_router.delete("/sections/{section_id}")
async def delete_section(section_id: str):
    result = await db.sections.delete_one({"id": section_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Section not found")
    # Also delete articles in this section
    await db.articles.delete_many({"section_id": section_id})
    return {"message": "Section deleted successfully"}

# Article endpoints (updated to include like status)
@api_router.post("/articles", response_model=Article)
async def create_article(article: ArticleCreate):
    article_dict = article.dict()
    article_obj = Article(**article_dict)
    await db.articles.insert_one(article_obj.dict())
    return article_obj

@api_router.get("/articles", response_model=List[ArticleResponse])
async def get_articles(current_user: Optional[User] = Depends(lambda: None)):
    # Try to get current user without requiring authentication
    user_id = None
    try:
        # This is a hack to make authentication optional
        pass
    except:
        pass
    
    articles = await db.articles.find().to_list(1000)
    result = []
    for article in articles:
        article_response = await get_article_with_like_status(article, user_id)
        result.append(article_response)
    return result

@api_router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: str, current_user: Optional[User] = Depends(lambda: None)):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    user_id = None
    # Try to get current user without requiring authentication
    try:
        pass
    except:
        pass
    
    return await get_article_with_like_status(article, user_id)

# New endpoint to get articles with authentication
@api_router.get("/articles-auth", response_model=List[ArticleResponse])
async def get_articles_authenticated(current_user: User = Depends(get_current_user)):
    articles = await db.articles.find().to_list(1000)
    result = []
    for article in articles:
        article_response = await get_article_with_like_status(article, current_user.id)
        result.append(article_response)
    return result

@api_router.get("/articles-auth/{article_id}", response_model=ArticleResponse)
async def get_article_authenticated(article_id: str, current_user: User = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return await get_article_with_like_status(article, current_user.id)

@api_router.put("/articles/{article_id}", response_model=Article)
async def update_article(article_id: str, article_update: ArticleUpdate):
    existing_article = await db.articles.find_one({"id": article_id})
    if not existing_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    update_data = {k: v for k, v in article_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.articles.update_one({"id": article_id}, {"$set": update_data})
    updated_article = await db.articles.find_one({"id": article_id})
    return Article(**updated_article)

@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str):
    result = await db.articles.delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Also delete likes for this article
    await db.likes.delete_many({"article_id": article_id})
    return {"message": "Article deleted successfully"}

@api_router.get("/articles/section/{section_id}", response_model=List[ArticleResponse])
async def get_articles_by_section(section_id: str, current_user: Optional[User] = Depends(lambda: None)):
    articles = await db.articles.find({"section_id": section_id}).to_list(1000)
    result = []
    user_id = None
    for article in articles:
        article_response = await get_article_with_like_status(article, user_id)
        result.append(article_response)
    return result

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
