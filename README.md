# BloodBridge - Blood Donation Server

## Live Server URL
🌐 https://blood-donation-server-rose.vercel.app

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Atlas
- **Authentication:** JWT
- **Payment:** Stripe
- **Deployment:** Vercel

## NPM Packages Used
- express
- mongodb
- cors
- dotenv
- stripe
- jsonwebtoken
- nodemon

## API Endpoints

### Users
- POST `/users` - Create user
- GET `/users/role/:email` - Get user role
- GET `/users/search` - Search donors
- GET `/users` - Get all users
- PATCH `/users/:email` - Update user profile
- PATCH `/users/status/:email` - Update user status
- PATCH `/users/role/:email` - Update user role

### Donation Requests
- POST `/donation-requests` - Create donation request
- GET `/donation-requests/pending` - Get pending requests
- GET `/donation-requests/user/:email` - Get user's requests
- GET `/donation-requests` - Get all requests
- GET `/donation-requests/:id` - Get single request
- PATCH `/donation-requests/:id` - Update request
- DELETE `/donation-requests/:id` - Delete request

### Admin
- GET `/admin/stats` - Get admin statistics

### Funding
- POST `/create-payment-intent` - Create Stripe payment intent
- POST `/fundings` - Save funding
- GET `/fundings` - Get all fundings

## Environment Variables
- `MONGODB_URI`
- `STRIPE_SECRET_KEY`
- `JWT_SECRET`
- `PORT`