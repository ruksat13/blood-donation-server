const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ["http://localhost:5173", "https://visionary-raindrop-12bd9e.netlify.app"],
    credentials: true,
}));
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        const db = client.db("blood-donation");

        const usersCollection = db.collection("users");
        const donationRequestsCollection = db.collection("donationRequests");
        const fundingsCollection = db.collection("fundings");

        // ==================== USERS ====================

        // Save user
        app.post("/users", async (req, res) => {
            const user = req.body;
            const existing = await usersCollection.findOne({ email: user.email });
            if (existing) return res.send({ message: "User already exists" });
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // Get user role
        app.get("/users/role/:email", async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email });
            res.send({ role: user?.role || "donor" });
        });

        // Get all users with filter
        app.get("/users", async (req, res) => {
            const { status } = req.query;
            const query = status ? { status } : {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        // Search donors
        app.get("/users/search", async (req, res) => {
            const { bloodGroup, district, upazila } = req.query;
            const query = { bloodGroup, district, upazila, role: "donor" };
            const donors = await usersCollection.find(query).toArray();
            res.send(donors);
        });

        // Get single user by email
        app.get("/users/:email", async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email });
            res.send(user);
        });


        // Update user profile
        app.patch("/users/:email", async (req, res) => {
            const email = req.params.email;
            const updated = req.body;
            const result = await usersCollection.updateOne(
                { email },
                { $set: updated }
            );
            res.send(result);
        });

        // Update user status
        app.patch("/users/status/:email", async (req, res) => {
            const email = req.params.email;
            const { status } = req.body;
            const result = await usersCollection.updateOne(
                { email },
                { $set: { status } }
            );
            res.send(result);
        });

        // Update user role
        app.patch("/users/role/:email", async (req, res) => {
            const email = req.params.email;
            const { role } = req.body;
            const result = await usersCollection.updateOne(
                { email },
                { $set: { role } }
            );
            res.send(result);
        });

        // ==================== DONATION REQUESTS ====================

        // Create donation request
        app.post("/donation-requests", async (req, res) => {
            const request = req.body;
            const result = await donationRequestsCollection.insertOne(request);
            res.send(result);
        });

        // Get all pending (public)
        app.get("/donation-requests/pending", async (req, res) => {
            const requests = await donationRequestsCollection
                .find({ status: "pending" })
                .sort({ _id: -1 })
                .toArray();
            res.send(requests);
        });

        // Get all requests (admin/volunteer) with filter + pagination
        app.get("/donation-requests", async (req, res) => {
            const { status, page = 1, limit = 10 } = req.query;
            const query = status ? { status } : {};
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const total = await donationRequestsCollection.countDocuments(query);
            const requests = await donationRequestsCollection
                .find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .toArray();
            res.send({ requests, totalPages: Math.ceil(total / parseInt(limit)) });
        });

        // Get user's own requests
        app.get("/donation-requests/user/:email", async (req, res) => {
            const email = req.params.email;
            const { status, page, limit } = req.query;

            if (limit) {
                const query = { requesterEmail: email, ...(status ? { status } : {}) };
                const skip = (parseInt(page) - 1) * parseInt(limit);
                const total = await donationRequestsCollection.countDocuments(query);
                const requests = await donationRequestsCollection
                    .find(query)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .toArray();
                return res.send({ requests, totalPages: Math.ceil(total / parseInt(limit)) });
            }

            // For donor home (recent 3)
            const requests = await donationRequestsCollection
                .find({ requesterEmail: email })
                .sort({ _id: -1 })
                .limit(3)
                .toArray();
            res.send(requests);
        });

        // Get single request
        app.get("/donation-requests/:id", async (req, res) => {
            const id = req.params.id;
            const request = await donationRequestsCollection.findOne({
                _id: new ObjectId(id),
            });
            res.send(request);
        });

        // Update donation request
        app.patch("/donation-requests/:id", async (req, res) => {
            const id = req.params.id;
            const updated = req.body;
            const result = await donationRequestsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updated }
            );
            res.send(result);
        });

        // Delete donation request
        app.delete("/donation-requests/:id", async (req, res) => {
            const id = req.params.id;
            const result = await donationRequestsCollection.deleteOne({
                _id: new ObjectId(id),
            });
            res.send(result);
        });

        // ==================== ADMIN STATS ====================

        // Get donation requests count by status
        app.get("/donation-requests/stats/count", async (req, res) => {
            const pending = await donationRequestsCollection.countDocuments({ status: "pending" });
            const inprogress = await donationRequestsCollection.countDocuments({ status: "inprogress" });
            const done = await donationRequestsCollection.countDocuments({ status: "done" });
            const canceled = await donationRequestsCollection.countDocuments({ status: "canceled" });
            res.send({ pending, inprogress, done, canceled });
        });
        app.get("/admin/stats", async (req, res) => {
            const totalUsers = await usersCollection.countDocuments({ role: "donor" });
            const totalRequests = await donationRequestsCollection.countDocuments();
            const fundingData = await fundingsCollection.find().toArray();
            const totalFunding = fundingData.reduce((sum, f) => sum + f.amount, 0);
            res.send({ totalUsers, totalRequests, totalFunding });
        });

        // ==================== FUNDING ====================

        app.post("/create-payment-intent", async (req, res) => {
            const { amount } = req.body;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount * 100,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        app.post("/fundings", async (req, res) => {
            const funding = req.body;
            const result = await fundingsCollection.insertOne(funding);
            res.send(result);
        });

        app.get("/fundings", async (req, res) => {
            const fundings = await fundingsCollection.find().sort({ _id: -1 }).toArray();
            res.send(fundings);
        });

        // ==================== ROOT ====================
        // Health check route
        app.get("/health", (req, res) => {
            res.json({
                status: "ok",
                timestamp: new Date().toISOString()
            });
        });
        app.get("/", (req, res) => {
            res.json({
                status: "success",
                message: "BloodBridge Server is running!",
                version: "1.0.0"
            });
        });

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (err) {
        console.error(err);
    }
}
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});
run();