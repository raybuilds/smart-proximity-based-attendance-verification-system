const { PrismaClient } = require("@prisma/client");
const connectionString = "postgresql://neondb_owner:npg_EXGRzWDFK01k@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

// Temporarily point execution DATABASE_URL to production Neon
process.env.DATABASE_URL = connectionString;

// Include the seeding logic
const seedScript = require("./seed_demo_data.js");
