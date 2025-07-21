import jwt from "jsonwebtoken"
export function generateToken(user) {
    // console.log(email, process.env.JWT_SECRET)
    return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "10h" });
}