# 🎫 License Management API - Complete Guide

## 📋 Overview

The License Management API provides comprehensive endpoints for managing user licenses, tier upgrades/downgrades, and license lifecycle operations.

**Base URL:** `http://localhost:3000/api/license`

**Authentication:** All endpoints require JWT Bearer token

---

## 🔑 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get current user's license |
| GET | `/status` | Check license status & validation |
| GET | `/stats` | Get comprehensive license statistics |
| POST | `/upgrade` | Upgrade to PREMIUM tier |
| POST | `/downgrade` | Downgrade to FREE tier |
| POST | `/create` | Create new license |
| POST | `/renew` | Renew existing license |
| POST | `/trial` | Grant trial license |
| POST | `/convert-trial` | Convert trial to paid |
| PATCH | `/status` | Update license status |
| DELETE | `/cancel` | Cancel license |

---

## 📖 Detailed API Documentation

### 1. Get Current User's License

**GET** `/api/license/me`

Get the authenticated user's license information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "license-uuid",
    "userId": "user-uuid",
    "licenseType": "TRIAL",
    "status": "ACTIVE",
    "dateStart": "2026-01-01T00:00:00.000Z",
    "dateEnd": "2026-01-15T00:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "daysRemaining": 14,
    "isExpired": false
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "No license found",
  "message": "User does not have a license"
}
```

---

### 2. Check License Status

**GET** `/api/license/status`

Validate if the user's license is active and not expired.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK - Valid):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "license": {
      "id": "license-uuid",
      "licenseType": "PAID",
      "status": "ACTIVE",
      "daysRemaining": 30,
      "isExpired": false
    }
  }
}
```

**Response (200 OK - Invalid):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "reason": "License has expired",
    "license": {
      "id": "license-uuid",
      "status": "EXPIRED",
      "isExpired": true
    }
  }
}
```

---

### 3. Get License Statistics

**GET** `/api/license/stats`

Get comprehensive statistics about user's license and usage.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hasLicense": true,
    "licenseType": "TRIAL",
    "status": "ACTIVE",
    "tier": "FREE",
    "modelLimit": 5,
    "modelsUsed": 3,
    "modelsRemaining": 2,
    "daysRemaining": 10,
    "isExpired": false,
    "isExpiringSoon": false
  }
}
```

---

### 4. Upgrade to PREMIUM Tier

**POST** `/api/license/upgrade`

Upgrade user from FREE to PREMIUM tier.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully upgraded to PREMIUM tier",
  "data": {
    "tier": "PREMIUM",
    "modelLimit": 999999
  }
}
```

**Response (400 Bad Request - Already Premium):**
```json
{
  "success": false,
  "error": "User is already on PREMIUM tier",
  "data": {
    "currentTier": "PREMIUM",
    "currentLimit": 999999
  }
}
```

---

### 5. Downgrade to FREE Tier

**POST** `/api/license/downgrade`

Downgrade user from PREMIUM to FREE tier.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully downgraded to FREE tier",
  "data": {
    "tier": "FREE",
    "modelLimit": 5
  }
}
```

**Response (500 Error - Too Many Models):**
```json
{
  "success": false,
  "error": "Failed to downgrade tier",
  "details": "Cannot downgrade: User has 10 models, exceeding FREE tier limit of 5"
}
```

---

### 6. Create License

**POST** `/api/license/create`

Create a new license for the user.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "licenseType": "TRIAL",
  "dateEnd": "2026-01-31T23:59:59.000Z"
}
```

**Fields:**
- `licenseType` (required): `"TRIAL"` or `"PAID"`
- `dateEnd` (optional): License expiry date (ISO 8601 format)
  - If not provided for TRIAL, defaults to 14 days from now

**Response (201 Created):**
```json
{
  "success": true,
  "message": "License created successfully",
  "data": {
    "id": "license-uuid",
    "userId": "user-uuid",
    "licenseType": "TRIAL",
    "status": "ACTIVE",
    "dateStart": "2026-01-01T00:00:00.000Z",
    "dateEnd": "2026-01-31T23:59:59.000Z",
    "daysRemaining": 30,
    "isExpired": false
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid license type",
  "message": "licenseType must be either TRIAL or PAID"
}
```

---

### 7. Renew License

**POST** `/api/license/renew`

Renew an existing license with a new expiry date.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "dateEnd": "2026-12-31T23:59:59.000Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "License renewed successfully",
  "data": {
    "id": "license-uuid",
    "status": "ACTIVE",
    "dateEnd": "2026-12-31T23:59:59.000Z",
    "daysRemaining": 365,
    "isExpired": false
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "No license found",
  "message": "User does not have a license to renew"
}
```

---

### 8. Grant Trial License

**POST** `/api/license/trial`

Grant a 14-day trial license to the user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Trial license granted successfully",
  "data": {
    "id": "license-uuid",
    "licenseType": "TRIAL",
    "status": "ACTIVE",
    "dateStart": "2026-01-01T00:00:00.000Z",
    "dateEnd": "2026-01-15T00:00:00.000Z",
    "daysRemaining": 14,
    "isExpired": false
  }
}
```

---

### 9. Convert Trial to Paid

**POST** `/api/license/convert-trial`

Convert a trial license to a paid license.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "dateEnd": "2027-01-01T23:59:59.000Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Trial license converted to paid successfully",
  "data": {
    "id": "license-uuid",
    "licenseType": "PAID",
    "status": "ACTIVE",
    "dateEnd": "2027-01-01T23:59:59.000Z",
    "daysRemaining": 365
  }
}
```

**Response (500 Error):**
```json
{
  "success": false,
  "error": "Failed to convert trial license",
  "details": "License is not a trial license"
}
```

---

### 10. Update License Status

**PATCH** `/api/license/status`

Update the status of a license.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "SUSPENDED"
}
```

**Valid Status Values:**
- `ACTIVE`
- `EXPIRED`
- `SUSPENDED`
- `CANCELLED`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "License status updated successfully",
  "data": {
    "id": "license-uuid",
    "status": "SUSPENDED"
  }
}
```

---

### 11. Cancel License

**DELETE** `/api/license/cancel`

Cancel the user's license and downgrade to FREE tier.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "License cancelled successfully. User downgraded to FREE tier.",
  "data": {
    "id": "license-uuid",
    "status": "CANCELLED"
  }
}
```

---

## 🧪 Testing with Postman/Thunder Client

### Setup

1. **Login First:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@1234"
}
```

2. **Copy Access Token** from response
3. **Set Authorization Header** for all license requests:
```
Authorization: Bearer <your_access_token>
```

---

### Test Scenarios

#### Scenario 1: New User - Grant Trial License

```http
### 1. Grant trial license
POST http://localhost:3000/api/license/trial
Authorization: Bearer {{token}}

### 2. Check license stats
GET http://localhost:3000/api/license/stats
Authorization: Bearer {{token}}

### Expected Result:
# - Trial license created
# - 14 days remaining
# - User still on FREE tier (5 model limit)
```

---

#### Scenario 2: Upgrade to Premium

```http
### 1. Check current stats
GET http://localhost:3000/api/license/stats
Authorization: Bearer {{token}}

### 2. Upgrade to PREMIUM
POST http://localhost:3000/api/license/upgrade
Authorization: Bearer {{token}}

### 3. Verify upgrade
GET http://localhost:3000/api/license/stats
Authorization: Bearer {{token}}

### Expected Result:
# - Tier changed to PREMIUM
# - Model limit changed to 999999
```

---

#### Scenario 3: Convert Trial to Paid

```http
### 1. Grant trial
POST http://localhost:3000/api/license/trial
Authorization: Bearer {{token}}

### 2. Convert to paid (1 year)
POST http://localhost:3000/api/license/convert-trial
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "dateEnd": "2027-01-12T23:59:59.000Z"
}

### 3. Verify conversion
GET http://localhost:3000/api/license/me
Authorization: Bearer {{token}}

### Expected Result:
# - License type changed from TRIAL to PAID
# - Date end updated to 1 year from now
```

---

#### Scenario 4: License Expiry Check

```http
### 1. Check license status
GET http://localhost:3000/api/license/status
Authorization: Bearer {{token}}

### 2. Get detailed stats
GET http://localhost:3000/api/license/stats
Authorization: Bearer {{token}}

### Expected Result:
# - valid: true/false
# - daysRemaining: number
# - isExpired: true/false
# - isExpiringSoon: true/false (if < 7 days)
```

---

#### Scenario 5: Cancel License

```http
### 1. Cancel license
DELETE http://localhost:3000/api/license/cancel
Authorization: Bearer {{token}}

### 2. Verify downgrade
GET http://localhost:3000/api/license/stats
Authorization: Bearer {{token}}

### Expected Result:
# - License status: CANCELLED
# - User tier: FREE
# - Model limit: 5
```

---

## 🔄 Complete User Flow Example

```http
### STEP 1: Register new user
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "Test@1234",
  "name": "New User"
}

###

### STEP 2: Login
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "Test@1234"
}

# Copy the accessToken from response

###

### STEP 3: Check initial license stats
GET http://localhost:3000/api/license/stats
Authorization: Bearer <token>

# Expected: No license, FREE tier, 5 model limit

###

### STEP 4: Grant trial license
POST http://localhost:3000/api/license/trial
Authorization: Bearer <token>

# Expected: TRIAL license created, 14 days

###

### STEP 5: Upload some models (test limit)
POST http://localhost:3000/api/models/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

# Upload 5 models to reach FREE tier limit

###

### STEP 6: Try to upload 6th model
POST http://localhost:3000/api/models/upload
Authorization: Bearer <token>

# Expected: 403 Forbidden - MODEL_LIMIT_REACHED

###

### STEP 7: Upgrade to PREMIUM
POST http://localhost:3000/api/license/upgrade
Authorization: Bearer <token>

# Expected: Tier upgraded, limit = 999999

###

### STEP 8: Upload 6th model (should work now)
POST http://localhost:3000/api/models/upload
Authorization: Bearer <token>

# Expected: 200 OK - Upload successful

###

### STEP 9: Convert trial to paid
POST http://localhost:3000/api/license/convert-trial
Authorization: Bearer <token>
Content-Type: application/json

{
  "dateEnd": "2027-01-12T23:59:59.000Z"
}

# Expected: License type changed to PAID

###

### STEP 10: Verify final state
GET http://localhost:3000/api/license/stats
Authorization: Bearer <token>

# Expected:
# - License: PAID
# - Tier: PREMIUM
# - Model limit: 999999
# - Days remaining: ~365
```

---

## 🎯 Key Features

### Automatic License Expiry
- Middleware automatically checks license expiry on each request
- Expired licenses are auto-updated to `EXPIRED` status
- Users are automatically downgraded to FREE tier

### Trial License
- 14-day duration by default
- Can be converted to PAID license
- Automatically created for new users (via auth service)

### Tier System
- **FREE**: 5 models maximum
- **PREMIUM**: Unlimited models (999,999)
- Enforced via `checkModelLimit` middleware

### License Validation
- Real-time validation on API calls
- Expiry warnings 7 days before expiration
- Status checks (ACTIVE, EXPIRED, SUSPENDED, CANCELLED)

---

## 🚨 Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | MODEL_LIMIT_REACHED | User exceeded tier limit |
| 403 | LICENSE_EXPIRED | License has expired |
| 403 | LICENSE_INACTIVE | License is suspended/cancelled |
| 404 | No license found | User doesn't have a license |
| 400 | Invalid license type | Invalid licenseType value |
| 400 | Invalid status | Invalid status value |
| 500 | Server error | Internal server error |

---

## 📊 Database Schema Reference

### License Table
```typescript
{
  id: string (UUID)
  userId: string (UUID, unique)
  licenseType: 'TRIAL' | 'PAID'
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED'
  dateStart: DateTime
  dateEnd: DateTime?
  createdAt: DateTime
  updatedAt: DateTime
}
```

### User Fields (License-related)
```typescript
{
  tier: 'FREE' | 'PREMIUM'
  modelLimit: number (5 for FREE, 999999 for PREMIUM)
  modelsUsed: number
}
```

---

## 🔧 Integration with Other APIs

### Model Import API
```typescript
// Automatically enforces license limits
POST /api/models/upload
Middleware: checkModelLimit → Checks tier and usage
```

### Auth API
```typescript
// Automatically creates trial license on registration
POST /api/auth/register
Service: Creates user + trial license
```

---

## 💡 Best Practices

1. **Always check license stats before operations**
   ```http
   GET /api/license/stats
   ```

2. **Handle MODEL_LIMIT_REACHED gracefully**
   - Show upgrade prompt to user
   - Redirect to pricing page

3. **Monitor license expiry**
   - Check `isExpiringSoon` flag
   - Send renewal reminders

4. **Use trial conversion for payments**
   ```http
   POST /api/license/convert-trial
   ```

5. **Validate license before critical operations**
   ```http
   GET /api/license/status
   ```

---

## 🎉 Summary

The License Management API provides:
- ✅ Complete CRUD operations for licenses
- ✅ Tier management (FREE ↔ PREMIUM)
- ✅ Trial license support
- ✅ Automatic expiry handling
- ✅ Model limit enforcement
- ✅ Comprehensive statistics

**All endpoints are production-ready and fully tested!**
