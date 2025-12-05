import Database from "../config/database";
import connectDB from "../config/database";
import User from "../models/User";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const createSuperAdmin = async () => {
  try {
      await Database.getInstance().connect();

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: "super_admin" });
    if (existingSuperAdmin) {
      console.log("Super admin already exists:", existingSuperAdmin.email);
      process.exit(0);
    }

    // Get super admin details from environment variables
    const firstName = process.env.SUPER_ADMIN_FIRST_NAME || "Super";
    const lastName = process.env.SUPER_ADMIN_LAST_NAME || "Admin";
    const email = process.env.SUPER_ADMIN_EMAIL || "admin@craftopia.com";
    const password = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin123!";


    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create super admin
    const superAdmin = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "super_admin",
      isActive: true,
    });

    await superAdmin.save();

    console.log(`
🎉 Super admin created successfully!

Email: ${email}
Password: ${password}
Role: super_admin

⚠️  Please change the default password after first login!
    `);

    process.exit(0);
  } catch (error) {
    console.error("Error creating super admin:", error);
    process.exit(1);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  createSuperAdmin();
}

export { createSuperAdmin };
