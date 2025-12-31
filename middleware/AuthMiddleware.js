import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token)
    return res.status(401).json({ message: "Not authorized, no token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(401).json({ message: "User no longer exists" });

    // Optional hard check: ensure this is latest token
    if (user.jwtToken !== token)
      return res.status(401).json({ message: "Session expired" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};
