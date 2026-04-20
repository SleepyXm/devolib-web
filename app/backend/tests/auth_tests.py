# auth_tests.py
import pytest
pytest_plugins = ('pytest_asyncio',)
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from databases import Database
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Assuming your app setup
from main import app
from database import database
from routers.auth.auth_utils import create_access_token, verify_token, SECRET_KEY, ALGORITHM
from routers.auth.auth import hash_password, verify_password


# ============================================================================
# FIXTURES (Test Setup)
# ============================================================================

@pytest_asyncio.fixture
async def client():
    """Async test client"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture 
async def test_db():
    """Setup test database"""
    await database.connect()
    await database.execute("DELETE FROM users")
    yield database
    await database.disconnect()

@pytest_asyncio.fixture
def test_user_data():
    """Sample user data for tests"""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "SecurePass123!"
    }

# ============================================================================
# UNIT TESTS (Individual Functions)
# ============================================================================

class TestPasswordUtilities:
    """Test password hashing and verification"""
    
    def test_hash_password_returns_bcrypt_hash(self):
        """Should return a bcrypt hash string"""
        password = "mypassword123"
        hashed = hash_password(password)
        
        assert hashed is not None
        assert isinstance(hashed, str)
        assert hashed.startswith("$2b$")  # bcrypt prefix
        assert hashed != password  # Should be hashed, not plain
    
    def test_hash_password_different_for_same_input(self):
        """Should generate different hashes for same password (salt)"""
        password = "mypassword123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        assert hash1 != hash2  # Different due to random salt
    
    def test_verify_password_correct(self):
        """Should verify correct password"""
        password = "mypassword123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Should reject incorrect password"""
        password = "mypassword123"
        wrong_password = "wrongpassword"
        hashed = hash_password(password)
        
        assert verify_password(wrong_password, hashed) is False
    
    def test_verify_password_empty_string(self):
        """Should handle empty password"""
        hashed = hash_password("validpass")
        assert verify_password("", hashed) is False


class TestJWTTokens:
    """Test JWT creation and verification"""
    
    def test_create_access_token_returns_valid_jwt(self):
        """Should create a valid JWT token"""
        user_id = "user123"
        token = create_access_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_verify_token_valid(self):
        """Should verify valid token and return user_id"""
        user_id = "user123"
        token = create_access_token(user_id)
        
        decoded_user_id = verify_token(token)
        assert decoded_user_id == user_id
    
    def test_verify_token_expired(self):
        """Should reject expired token"""
        # Create token that expired 1 hour ago
        user_id = "user123"
        expire = datetime.utcnow() - timedelta(hours=1)
        to_encode = {"sub": user_id, "exp": expire}
        expired_token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        assert verify_token(expired_token) is None
    
    def test_verify_token_invalid_signature(self):
        """Should reject token with wrong signature"""
        user_id = "user123"
        wrong_secret = "wrongsecret"
        expire = datetime.utcnow() + timedelta(minutes=30)
        to_encode = {"sub": user_id, "exp": expire}
        bad_token = jwt.encode(to_encode, wrong_secret, algorithm=ALGORITHM)
        
        assert verify_token(bad_token) is None
    
    def test_verify_token_malformed(self):
        """Should handle malformed tokens"""
        assert verify_token("not.a.token") is None
        assert verify_token("") is None
        assert verify_token(None) is None


# ============================================================================
# INTEGRATION TESTS (API Endpoints)
# ============================================================================

class TestSignupEndpoint:
    """Test /signup endpoint"""
    
    @pytest.mark.asyncio
    async def test_signup_success(self, client, test_db, test_user_data):
        """Should create new user successfully"""
        response = await client.post("/auth/signup", json=test_user_data)
        
        assert response.status_code == 200
        assert response.json() == {"message": "User created successfully"}
        
        # Verify user exists in database
        query = "SELECT * FROM users WHERE username = :username"
        user = await test_db.fetch_one(query=query, values={"username": test_user_data["username"]})
        assert user is not None
        assert user["email"] == test_user_data["email"]
        assert user["password"] != test_user_data["password"]  # Should be hashed
    
    @pytest.mark.asyncio
    async def test_signup_duplicate_username(self, client, test_db, test_user_data):
        """Should reject duplicate username"""
        # First signup
        await client.post("/auth/signup", json=test_user_data)
        
        # Second signup with same username
        response = await client.post("/auth/signup", json=test_user_data)
        
        assert response.status_code == 400
        assert "Username taken" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_signup_duplicate_email(self, client, test_db, test_user_data):
        """Should reject duplicate email"""
        # First signup
        await client.post("/auth/signup", json=test_user_data)
        
        # Second signup with different username, same email
        duplicate_email_user = {
            "username": "different_user",
            "email": test_user_data["email"],  # Same email
            "password": "AnotherPass123!"
        }
        response = await client.post("/auth/signup", json=duplicate_email_user)
        
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_signup_invalid_data(self, client, test_db):
        """Should reject invalid signup data"""
        invalid_data = {
            "username": "",  # Empty username
            "email": "not-an-email",  # Invalid email
            "password": "123"  # Weak password
        }
        response = await client.post("/auth/signup", json=invalid_data)
        
        assert response.status_code == 422  # Validation error


class TestLoginEndpoint:
    """Test /login endpoint"""
    
    @pytest.mark.asyncio
    async def test_login_success(self, client, test_db, test_user_data):
        """Should login successfully with correct credentials"""
        # Create user first
        await client.post("/auth/signup", json=test_user_data)
        
        # Login
        login_data = {
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        }
        response = await client.post("/auth/login", json=login_data)
        
        assert response.status_code == 200
        assert "message" in response.json()
        assert "token" in response.json()
        
        # Check cookie was set
        assert "access_token" in response.cookies
        cookie_value = response.cookies["access_token"]
        assert cookie_value.startswith('"Bearer ')
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client, test_db, test_user_data):
        """Should reject login with wrong password"""
        # Create user
        await client.post("/auth/signup", json=test_user_data)
        
        # Login with wrong password
        login_data = {
            "username": test_user_data["username"],
            "password": "WrongPassword123!"
        }
        response = await client.post("/auth/login", json=login_data)
        
        assert response.status_code == 400
        assert "Username or Password Incorrect" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client, test_db):
        """Should reject login for non-existent user"""
        login_data = {
            "username": "nonexistent",
            "password": "SomePass123!"
        }
        response = await client.post("/auth/login", json=login_data)
        
        assert response.status_code == 400
        assert "Username or Password Incorrect" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_login_cookie_properties(self, client, test_db, test_user_data):
        """Should set cookie with correct security properties"""
        # Create and login
        await client.post("/auth/signup", json=test_user_data)
        login_data = {
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        }
        response = await client.post("/auth/login", json=login_data)
        
        # Check cookie properties
        cookie = response.cookies.get("access_token")
        assert cookie is not None
        # Note: httponly, secure, samesite are set server-side
        # Check in response headers if needed


class TestMeEndpoint:
    """Test /me endpoint (protected route)"""
    
    @pytest.mark.asyncio
    async def test_me_with_valid_token(self, client, test_db, test_user_data):
        """Should return user data with valid token"""
        # Create user
        await client.post("/auth/signup", json=test_user_data)

        # Login and grab token
        login_response = await client.post("/auth/login", json={
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        })
        cookie = login_response.cookies.get("access_token")


        print("LOGIN RESPONSE JSON:", login_response.json())
        print("LOGIN RESPONSE HEADERS:", login_response.headers)

        # Call /me using JWT
        response = await client.get("/auth/me", cookies={"access_token": cookie})

        assert response.status_code == 200
        assert response.json()["username"] == test_user_data["username"]
    
    @pytest.mark.asyncio
    async def test_me_without_token(self, client, test_db):
        """Should reject request without token"""
        response = await client.get("/auth/me")
        
        assert response.status_code == 401
        assert "Missing authentication token" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_me_with_invalid_token(self, client, test_db):
        """Should reject request with invalid token"""
        # Manually set invalid cookie
        client.cookies.set("access_token", "Bearer invalid.token.here")
        
        response = await client.get("/auth/me")
        
        assert response.status_code == 401


class TestLogoutEndpoint:
    """Test /logout endpoint"""
    
    @pytest.mark.asyncio
    async def test_logout_success(self, client, test_db, test_user_data):
        """Should logout and clear cookie"""
        # Create user and login
        await client.post("/auth/signup", json=test_user_data)
        await client.post("/auth/login", json={
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        })
        
        # Logout
        response = await client.post("/auth/logout")
        
        assert response.status_code == 200
        assert response.json()["message"] == "Logged out successfully"
        
        # Cookie should be cleared (check if empty or expired)
        # After logout, /me should fail
        me_response = await client.get("/auth/me")
        assert me_response.status_code == 401


# ============================================================================
# SECURITY TESTS
# ============================================================================

class TestSecurityFeatures:
    """Test security-related functionality"""
    
    @pytest.mark.asyncio
    async def test_password_not_returned_in_response(self, client, test_db, test_user_data):
        """Should never return password in any response"""
        await client.post("/auth/signup", json=test_user_data)
        login_response = await client.post("/auth/login", json={
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        })
        
        me_response = await client.get("/auth/me")
        
        # Check no password in responses
        assert "password" not in login_response.json()
        assert "password" not in me_response.json()
    
    @pytest.mark.asyncio
    async def test_sql_injection_prevention(self, client, test_db):
        """Should prevent SQL injection attacks"""
        malicious_data = {
            "username": "admin' OR '1'='1",
            "email": "test@example.com",
            "password": "Pass123!"
        }
        
        # Should safely handle malicious input
        response = await client.post("/auth/signup", json=malicious_data)
        assert response.status_code in [200, 400]  # Either creates or rejects, but doesn't crash
    
    @pytest.mark.asyncio
    async def test_timing_attack_resistance(self, client, test_db, test_user_data):
        """Login should take similar time for valid/invalid users"""
        import time
        
        await client.post("/auth/signup", json=test_user_data)
        
        # Time login with valid user
        start = time.time()
        await client.post("/auth/login", json={
            "username": test_user_data["username"],
            "password": "WrongPass"
        })
        valid_user_time = time.time() - start
        
        # Time login with invalid user
        start = time.time()
        await client.post("/auth/login", json={
            "username": "nonexistent",
            "password": "WrongPass"
        })
        invalid_user_time = time.time() - start
        
        # Times should be similar (within 100ms)
        # This prevents attackers from determining if username exists
        assert abs(valid_user_time - invalid_user_time) < 0.1


# ============================================================================
# RUN TESTS
# ============================================================================

# Run with: pytest auth_tests.py -v