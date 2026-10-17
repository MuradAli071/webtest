import jwt from "jsonwebtoken";

export const adminCookieName = "superx_admin";

export function requireAdmin(request, response, next) {
  const token = request.cookies?.[adminCookieName];
  if (!token) {
    return response.status(401).json({ error: "Administrator sign-in required." });
  }

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (claims.role !== "admin") {
      return response.status(401).json({ error: "Administrator session is invalid or expired." });
    }
    return next();
  } catch {
    return response.status(401).json({ error: "Administrator session is invalid or expired." });
  }
}
