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
    tags: List[str] = Field(default_factory=list)
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
    site_name: str = "Foursan al aQida"
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LogoUpdate(BaseModel):
    logo_data: Optional[str] = None
    logo_name: Optional[str] = None

class SearchFilters(BaseModel):
    section_id: Optional[str] = None
    author: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    sort_by: str = "relevance"

class SearchResult(BaseModel):
    articles: List[ArticleResponse]
    sections: List[Section]
    total_results: int
    query: str
    filters: SearchFilters

class SearchSuggestions(BaseModel):
    suggestions: List[str]

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
    
    # Also delete likes and comments for this article
    await db.likes.delete_many({"article_id": article_id})
    await db.comments.delete_many({"article_id": article_id})
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

# Comment endpoints
@api_router.post("/articles/{article_id}/comments", response_model=CommentResponse)
async def create_comment(article_id: str, comment: CommentCreate, current_user: User = Depends(get_current_user)):
    # Check if article exists
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    comment_dict = comment.dict()
    comment_dict["user_id"] = current_user.id
    comment_dict["article_id"] = article_id
    comment_obj = Comment(**comment_dict)
    
    await db.comments.insert_one(comment_obj.dict())
    
    # Return comment with user info
    return CommentResponse(
        **comment_obj.dict(),
        user_full_name=current_user.full_name,
        user_profile_picture=current_user.profile_picture
    )

@api_router.get("/articles/{article_id}/comments", response_model=List[CommentResponse])
async def get_article_comments(article_id: str):
    # Check if article exists
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Get comments for this article
    comments = await db.comments.find({"article_id": article_id}).sort("created_at", 1).to_list(1000)
    
    # Enrich comments with user info
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

@api_router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(comment_id: str, comment_update: CommentUpdate, current_user: User = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if user owns this comment
    if comment["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    
    # Update comment
    update_data = comment_update.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    await db.comments.update_one({"id": comment_id}, {"$set": update_data})
    updated_comment = await db.comments.find_one({"id": comment_id})
    
    return CommentResponse(
        **updated_comment,
        user_full_name=current_user.full_name,
        user_profile_picture=current_user.profile_picture
    )

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if user owns this comment
    if comment["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    
    result = await db.comments.delete_one({"id": comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    return {"message": "Comment deleted successfully"}

# Search endpoints
@api_router.get("/search")
async def search_content(
    q: str = "",
    section_id: Optional[str] = None,
    author: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    sort_by: str = "relevance"  # relevance, date_desc, date_asc
):
    """
    Search for articles and sections
    Parameters:
    - q: search query (searches in title, content, author)
    - section_id: filter by specific section
    - author: filter by author name
    - from_date: filter articles from this date (YYYY-MM-DD)
    - to_date: filter articles to this date (YYYY-MM-DD)
    - sort_by: sort results (relevance, date_desc, date_asc)
    """
    if not q.strip() and not section_id and not author:
        return {
            "articles": [],
            "sections": [],
            "total_results": 0,
            "query": q
        }
    
    # Build search filters
    article_filters = {}
    section_filters = {}
    
    # Text search using regex for MongoDB with Arabic normalization
    if q.strip():
        # Normalize Arabic text for better search results
        # Handle hamza variations: أ إ آ ا - ؤ و - ئ ي - ء
        normalized_query = q.strip()
        
        # Create search patterns that handle hamza variations
        # Replace أ إ آ with pattern that matches all variations
        hamza_alef_pattern = normalized_query.replace('أ', '[أإآا]').replace('إ', '[أإآا]').replace('آ', '[أإآا]').replace('ا', '[أإآا]')
        # Replace ؤ with pattern that matches ؤ and و
        hamza_waw_pattern = hamza_alef_pattern.replace('ؤ', '[ؤو]').replace('و', '[ؤو]')
        # Replace ئ with pattern that matches ئ and ي
        final_pattern = hamza_waw_pattern.replace('ئ', '[ئي]').replace('ي', '[ئي]')
        
        search_regex = {"$regex": final_pattern, "$options": "i"}  # case insensitive
        article_filters["$or"] = [
            {"title": search_regex},
            {"content": search_regex},
            {"author": search_regex}
        ]
        section_filters["$or"] = [
            {"name": search_regex},
            {"description": search_regex}
        ]
    
    # Section filter
    if section_id:
        article_filters["section_id"] = section_id
    
    # Author filter
    if author:
        article_filters["author"] = {"$regex": author.strip(), "$options": "i"}
    
    # Date range filter
    if from_date or to_date:
        date_filter = {}
        if from_date:
            try:
                from datetime import datetime
                date_filter["$gte"] = datetime.strptime(from_date, "%Y-%m-%d")
            except ValueError:
                pass
        if to_date:
            try:
                from datetime import datetime
                date_filter["$lte"] = datetime.strptime(to_date, "%Y-%m-%d")
            except ValueError:
                pass
        if date_filter:
            article_filters["created_at"] = date_filter
    
    # Execute searches
    articles_cursor = db.articles.find(article_filters)
    sections_cursor = db.sections.find(section_filters)
    
    # Apply sorting
    if sort_by == "date_desc":
        articles_cursor = articles_cursor.sort("created_at", -1)
    elif sort_by == "date_asc":
        articles_cursor = articles_cursor.sort("created_at", 1)
    # For relevance, we'll use default order (could be enhanced with scoring)
    
    # Get results
    articles = await articles_cursor.limit(50).to_list(50)  # Limit to 50 results
    sections = await sections_cursor.limit(20).to_list(20)  # Limit to 20 results
    
    # Process articles to include like status for authenticated users
    processed_articles = []
    user_id = None  # Could be enhanced to get current user if authenticated
    
    for article in articles:
        article_response = await get_article_with_like_status(article, user_id)
        processed_articles.append(article_response)
    
    # Convert sections to proper format
    processed_sections = [Section(**section) for section in sections]
    
    # Calculate total results
    total_results = len(processed_articles) + len(processed_sections)
    
    return {
        "articles": processed_articles,
        "sections": processed_sections,
        "total_results": total_results,
        "query": q,
        "filters": {
            "section_id": section_id,
            "author": author,
            "from_date": from_date,
            "to_date": to_date,
            "sort_by": sort_by
        }
    }

@api_router.get("/search/suggestions")
async def get_search_suggestions(q: str = ""):
    """
    Get search suggestions based on existing content with Arabic normalization
    """
    if not q.strip() or len(q.strip()) < 2:
        return {"suggestions": []}
    
    # Normalize Arabic text for better search suggestions
    normalized_query = q.strip()
    # Handle hamza variations in suggestions
    hamza_alef_pattern = normalized_query.replace('أ', '[أإآا]').replace('إ', '[أإآا]').replace('آ', '[أإآا]').replace('ا', '[أإآا]')
    hamza_waw_pattern = hamza_alef_pattern.replace('ؤ', '[ؤو]').replace('و', '[ؤو]')
    final_pattern = hamza_waw_pattern.replace('ئ', '[ئي]').replace('ي', '[ئي]')
    
    search_regex = {"$regex": final_pattern, "$options": "i"}
    
    # Get article titles and authors that match
    articles = await db.articles.find(
        {"$or": [
            {"title": search_regex},
            {"author": search_regex}
        ]},
        {"title": 1, "author": 1}
    ).limit(10).to_list(10)
    
    # Get section names that match
    sections = await db.sections.find(
        {"name": search_regex},
        {"name": 1}
    ).limit(5).to_list(5)
    
    suggestions = []
    
    # Add unique titles
    for article in articles:
        if article["title"].lower() not in [s.lower() for s in suggestions]:
            suggestions.append(article["title"])
    
    # Add unique authors
    for article in articles:
        if article["author"].lower() not in [s.lower() for s in suggestions]:
            suggestions.append(article["author"])
    
    # Add section names
    for section in sections:
        if section["name"].lower() not in [s.lower() for s in suggestions]:
            suggestions.append(section["name"])
    
    return {"suggestions": suggestions[:10]}  # Return top 10 suggestions

# Site Settings / Logo Management endpoints
@api_router.get("/settings/logo")
async def get_site_logo():
    settings = await db.site_settings.find_one()
    if not settings:
        # Return default/empty logo info
        return {
            "logo_data": None,
            "logo_name": None,
            "site_name": "Foursan al aQida"
        }
    return {
        "logo_data": settings.get("logo_data"),
        "logo_name": settings.get("logo_name"),
        "site_name": settings.get("site_name", "Foursan al aQida")
    }

@api_router.put("/settings/logo")
async def update_site_logo(logo_update: LogoUpdate):
    # In a real app, you'd want admin authentication here
    # For now, we'll use a simple approach
    
    existing_settings = await db.site_settings.find_one()
    
    if existing_settings:
        # Update existing settings
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
            "site_name": updated_settings.get("site_name", "Foursan al aQida")
        }
    else:
        # Create new settings
        settings_dict = logo_update.dict()
        settings_obj = SiteSettings(**settings_dict)
        await db.site_settings.insert_one(settings_obj.dict())
        return {
            "logo_data": settings_obj.logo_data,
            "logo_name": settings_obj.logo_name,
            "site_name": settings_obj.site_name
        }

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
