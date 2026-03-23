import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_TOKEN_SECRET;
export const authenticateToken = (req, res, next) => {
  // console.log("Authenticating token for request: checking headers");
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    
    return res.status(401).json({ message: "Access denied. No token provided." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    // console.log("Token verification failed:", error);
    res.status(403).json({ message: "Invalid or expired token." });
  }
};
