from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb+srv://your-cluster-url')
DB_NAME = os.environ.get('DB_NAME', 'foursan_al_aqida')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Foursan Al Aqida API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # Configure this properly for production
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    is_liked: Optional[bool] = None

class Like(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    article_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    article_id: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CommentCreate(BaseModel):
    content: str

class CommentUpdate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: str
    user_id: str
    article_id: str
    content: str
    created_at: datetime
    updated_at: datetime
    user_full_name: str
    user_profile_picture: Optional[str] = None

class SiteSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    logo_data: Optional[str] = None
    logo_name: Optional[str] = None
    site_name: str = "فرسان العقيدة"
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LogoUpdate(BaseModel):
    logo_data: Optional[str] = None
    logo_name: Optional[str] = None

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

# Authentication endpoints
@app.post("/register", response_model=Token)
async def register_user(user: UserCreate):
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
    
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict.pop("password")
    user_dict["hashed_password"] = hashed_password
    user_obj = User(**user_dict)
    
    await db.users.insert_one(user_obj.dict())
    
    access_token = create_access_token(data={"sub": user_obj.id})
    user_response = UserResponse(**user_obj.dict())
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@app.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin):
    user = await db.users.find_one({"username": user_credentials.username})
    if not user or not verify_password(user_credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    if not user["is_active"]:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_response = UserResponse(**user)
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@app.get("/profile", response_model=UserResponse)
async def get_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.dict())

@app.put("/profile", response_model=UserResponse)
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

# Section endpoints
@app.post("/sections", response_model=Section)
async def create_section(section: SectionCreate):
    section_dict = section.dict()
    section_obj = Section(**section_dict)
    await db.sections.insert_one(section_obj.dict())
    return section_obj

@app.get("/sections", response_model=List[Section])
async def get_sections():
    sections = await db.sections.find().to_list(1000)
    return [Section(**section) for section in sections]

@app.delete("/sections/{section_id}")
async def delete_section(section_id: str):
    result = await db.sections.delete_one({"id": section_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Section not found")
    await db.articles.delete_many({"section_id": section_id})
    return {"message": "Section deleted successfully"}

# Article endpoints
@app.post("/articles", response_model=Article)
async def create_article(article: ArticleCreate):
    article_dict = article.dict()
    article_obj = Article(**article_dict)
    await db.articles.insert_one(article_obj.dict())
    return article_obj

@app.get("/articles", response_model=List[ArticleResponse])
async def get_articles():
    articles = await db.articles.find().to_list(1000)
    result = []
    for article in articles:
        article_response = await get_article_with_like_status(article, None)
        result.append(article_response)
    return result

@app.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: str):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return await get_article_with_like_status(article, None)

@app.get("/articles-auth", response_model=List[ArticleResponse])
async def get_articles_authenticated(current_user: User = Depends(get_current_user)):
    articles = await db.articles.find().to_list(1000)
    result = []
    for article in articles:
        article_response = await get_article_with_like_status(article, current_user.id)
        result.append(article_response)
    return result

@app.get("/articles-auth/{article_id}", response_model=ArticleResponse)
async def get_article_authenticated(article_id: str, current_user: User = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return await get_article_with_like_status(article, current_user.id)

@app.put("/articles/{article_id}", response_model=Article)
async def update_article(article_id: str, article_update: ArticleUpdate):
    existing_article = await db.articles.find_one({"id": article_id})
    if not existing_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    update_data = {k: v for k, v in article_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.articles.update_one({"id": article_id}, {"$set": update_data})
    updated_article = await db.articles.find_one({"id": article_id})
    return Article(**updated_article)

@app.delete("/articles/{article_id}")
async def delete_article(article_id: str):
    result = await db.articles.delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    await db.likes.delete_many({"article_id": article_id})
    await db.comments.delete_many({"article_id": article_id})
    return {"message": "Article deleted successfully"}

@app.get("/articles/section/{section_id}", response_model=List[ArticleResponse])
async def get_articles_by_section(section_id: str):
    articles = await db.articles.find({"section_id": section_id}).to_list(1000)
    result = []
    for article in articles:
        article_response = await get_article_with_like_status(article, None)
        result.append(article_response)
    return result

# Like endpoints
@app.post("/articles/{article_id}/like")
async def like_article(article_id: str, current_user: User = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    existing_like = await db.likes.find_one({
        "user_id": current_user.id,
        "article_id": article_id
    })
    
    if existing_like:
        raise HTTPException(status_code=400, detail="Article already liked")
    
    like = Like(user_id=current_user.id, article_id=article_id)
    await db.likes.insert_one(like.dict())
    
    await db.articles.update_one(
        {"id": article_id},
        {"$inc": {"likes_count": 1}}
    )
    
    return {"message": "Article liked successfully"}

@app.delete("/articles/{article_id}/like")
async def unlike_article(article_id: str, current_user: User = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    existing_like = await db.likes.find_one({
        "user_id": current_user.id,
        "article_id": article_id
    })
    
    if not existing_like:
        raise HTTPException(status_code=400, detail="Article not liked yet")
    
    await db.likes.delete_one({
        "user_id": current_user.id,
        "article_id": article_id
    })
    
    await db.articles.update_one(
        {"id": article_id},
        {"$inc": {"likes_count": -1}}
    )
    
    return {"message": "Article unliked successfully"}

# Comment endpoints
@app.post("/articles/{article_id}/comments", response_model=CommentResponse)
async def create_comment(article_id: str, comment: CommentCreate, current_user: User = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    comment_dict = comment.dict()
    comment_dict["user_id"] = current_user.id
    comment_dict["article_id"] = article_id
    comment_obj = Comment(**comment_dict)
    
    await db.comments.insert_one(comment_obj.dict())
    
    return CommentResponse(
        **comment_obj.dict(),
        user_full_name=current_user.full_name,
        user_profile_picture=current_user.profile_picture
    )

@app.get("/articles/{article_id}/comments", response_model=List[CommentResponse])
async def get_article_comments(article_id: str):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    comments = await db.comments.find({"article_id": article_id}).sort("created_at", 1).to_list(1000)
    
    result = []
    for comment in comments:
        user = await db.users.find_one({"id": comment["user_id"]})
        if user:
            comment_response = CommentResponse(
                **comment,
                user_full_name=user["full_name"],
                user_profile_picture=user.get("profile_picture")
            )
            result.append(comment_response)
    
    return result

@app.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(comment_id: str, comment_update: CommentUpdate, current_user: User = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    
    update_data = comment_update.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    await db.comments.update_one({"id": comment_id}, {"$set": update_data})
    updated_comment = await db.comments.find_one({"id": comment_id})
    
    return CommentResponse(
        **updated_comment,
        user_full_name=current_user.full_name,
        user_profile_picture=current_user.profile_picture
    )

@app.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    
    result = await db.comments.delete_one({"id": comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    return {"message": "Comment deleted successfully"}

# Logo management endpoints
@app.get("/settings/logo")
async def get_site_logo():
    settings = await db.site_settings.find_one()
    if not settings:
        return {
            "logo_data": None,
            "logo_name": None,
            "site_name": "فرسان العقيدة"
        }
    return {
        "logo_data": settings.get("logo_data"),
        "logo_name": settings.get("logo_name"),
        "site_name": settings.get("site_name", "فرسان العقيدة")
    }

@app.put("/settings/logo")
async def update_site_logo(logo_update: LogoUpdate):
    existing_settings = await db.site_settings.find_one()
    
    if existing_settings:
        update_data = {}
        if logo_update.logo_data is not None:
            update_data["logo_data"] = logo_update.logo_data
        if logo_update.logo_name is not None:
            update_data["logo_name"] = logo_update.logo_name
        update_data["updated_at"] = datetime.utcnow()
        
        await db.site_settings.update_one({"id": existing_settings["id"]}, {"$set": update_data})
        updated_settings = await db.site_settings.find_one({"id": existing_settings["id"]})
        return {
            "logo_data": updated_settings.get("logo_data"),
            "logo_name": updated_settings.get("logo_name"),
            "site_name": updated_settings.get("site_name", "فرسان العقيدة")
        }
    else:
        settings_dict = logo_update.dict()
        settings_obj = SiteSettings(**settings_dict)
        await db.site_settings.insert_one(settings_obj.dict())
        return {
            "logo_data": settings_obj.logo_data,
            "logo_name": settings_obj.logo_name,
            "site_name": settings_obj.site_name
        }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Foursan Al Aqida API is running"}

# Export app for Vercel
def handler(request, context):
    return app(request, context)