import jwt from "jsonwebtoken";
import Secret from "../models/SecretModel.js";

// Generate JWT with dynamic secret
export const generateToken = async (userId) => {
  const secretEntry = await Secret.findOne({ name: "JWT_SECRET" });
  if (!secretEntry) throw new Error("JWT secret not found");

  const token = jwt.sign({ id: userId }, secretEntry.value, {
    expiresIn: "7d",
  });

  return token;
};
