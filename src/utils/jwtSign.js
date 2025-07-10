import jwt from "jsonwebtoken"
export function generateToken(email) {
    console.log(email, process.env.JWT_SECRET)
    return jwt.sign({email}, process.env.JWT_SECRET, { expiresIn: "10h" });
}