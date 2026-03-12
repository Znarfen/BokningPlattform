
import express from "express";
import jsonwebtoken from "jsonwebtoken";
import cookieParser from "cookie-parser";

const JWT_SECRET = "super_secret_key";

const roles = {
    admin: ["create", "remove", "update", "read"],
    moderator: ["update", "read"],
    user: ["read"]
}

export default function (app) {
    app.use(cookieParser());
    app.use(express.json());

    app.use((req, res, next) => {
        next();
    });
}

// Middleware for authentication and authorization
export function authentication(req, res, next) {
    const header = req.headers.authorization;
    const cookieToken = req.cookies.accessToken;

    if (!header && !cookieToken) return res.status(401).json({ message: "No token provided!" });

    // Extract token from header or cookie
    const token = header ? header.split(' ')[1] : cookieToken;

    if (!token) return res.status(401).json({ message: "Invalid token!" });

    try {
        const decoded = jsonwebtoken.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: "Failed to authenticate token!" });
    }
}


// Middleware for role-based authorization
export function authorizeRole(permission) {
    return (req, res, next) => {
        const rolePermissions = roles[req.user.role] || [];

        const hasPermission = permission.every(perm => rolePermissions.includes(perm));

        if (!hasPermission) {
            return res.status(403).json({ message: "Forbidden: You don't have the required permissions!" });
        }

        next();
    }
}
