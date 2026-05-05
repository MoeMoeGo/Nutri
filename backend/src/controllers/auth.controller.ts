import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import { config } from "@/config";
import { withTransaction } from "@/db/pool";
import { userQueries, tokenQueries } from "@/db/queries";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshTokenExpiresAt,
} from "@/utils/jwt";
import { AuthRequest } from "@/middleware/auth.middleware";
import { toUserDTO } from "@/utils/dto";

const googleClient = new OAuth2Client(config.google.clientId);

async function issueTokens(userId: string, email: string) {
  const accessToken = signAccessToken({ userId, email });
  const refreshToken = signRefreshToken({ userId, tokenId: `${userId}${Date.now()}` });
  const expiresAt = refreshTokenExpiresAt();

  await withTransaction(async (client) => {
    await tokenQueries.create(client, { token: refreshToken, userId, expiresAt });
  });

  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name } = req.body;

  const existing = await userQueries.findByEmail(email);
  if (existing) {
    res.status(409).json({ message: "An account with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await userQueries.create({ email, passwordHash, name });
  if (!user) { res.status(500).json({ message: "Failed to create user" }); return; }

  const tokens = await issueTokens(user.id, user.email);
  res.status(201).json({ user: toUserDTO(user), tokens });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await userQueries.findByEmail(email);
  if (!user?.password_hash) {
    res.status(401).json({ message: "Invalid email or password" }); return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ message: "Invalid email or password" }); return;
  }

  const tokens = await issueTokens(user.id, user.email);
  res.json({ user: toUserDTO(user), tokens });
}

export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ message: "Google ID Token is required" });
      return;
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });
    } catch (verifyError: any) {
      console.error("Google Token Verification Failed:", verifyError.message);
      res.status(401).json({ message: "Invalid or expired Google token" });
      return;
    }

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      res.status(400).json({ message: "Google token missing required profile data" });
      return;
    }

    let user = await userQueries.findByEmailOrGoogleId(payload.email, payload.sub);

    if (!user) {

      user = await userQueries.create({
        email: payload.email,
        name: payload.name ?? payload.email.split("@")[0],
        googleId: payload.sub,
      });
    } else if (!user.google_id) {

      user = await userQueries.updateSocialId(user.id, "google_id", payload.sub);
    }


    if (!user) {
      console.error("User upsert failed for email:", payload.email);
      res.status(500).json({ message: "Internal server error during account sync" });
      return;
    }


    const tokens = await issueTokens(user.id, user.email);

   
    res.json({
      user: toUserDTO(user),
      tokens
    });

  } catch (error) {
    
    console.error("Unexpected error in googleAuth:", error);
    res.status(500).json({ message: "An unexpected error occurred" });
  }
}

export async function appleAuth(req: Request, res: Response): Promise<void> {
  const { identityToken, fullName } = req.body;

  const appleUser = await appleSignin.verifyIdToken(identityToken, {
    audience: config.apple.clientId,
    ignoreExpiration: false,
  });
  if (!appleUser.email || !appleUser.sub) {
    res.status(400).json({ message: "Invalid Apple token" }); return;
  }

  let user = await userQueries.findByEmailOrAppleId(appleUser.email, appleUser.sub);
  const name =
    fullName?.givenName && fullName?.familyName
      ? `${fullName.givenName} ${fullName.familyName}`
      : appleUser.email.split("@")[0];

  if (!user) {
    user = await userQueries.create({ email: appleUser.email, name, appleId: appleUser.sub });
  } else if (!user.apple_id) {
    user = await userQueries.updateSocialId(user.id, "apple_id", appleUser.sub);
  }

  if (!user) { res.status(500).json({ message: "Failed to upsert user" }); return; }
  const tokens = await issueTokens(user.id, user.email);
  res.json({ user: toUserDTO(user), tokens });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) { res.status(400).json({ message: "Refresh token required" }); return; }

  let payload;
  try { payload = verifyRefreshToken(refreshToken); }
  catch { res.status(401).json({ message: "Invalid or expired refresh token" }); return; }

  const stored = await tokenQueries.findByToken(refreshToken);
  if (!stored || stored.expires_at < new Date()) {
    res.status(401).json({ message: "Refresh token revoked or expired" }); return;
  }

  const user = await userQueries.findById(stored.user_id);
  if (!user) { res.status(401).json({ message: "User not found" }); return; }

  const tokens = await withTransaction(async (client) => {
    await tokenQueries.deleteByToken(client, refreshToken);
    const newAccess = signAccessToken({ userId: user.id, email: user.email });
    const newRefresh = signRefreshToken({ userId: user.id, tokenId: `${user.id}${Date.now()}` });
    await tokenQueries.create(client, { token: newRefresh, userId: user.id, expiresAt: refreshTokenExpiresAt() });
    return { accessToken: newAccess, refreshToken: newRefresh };
  });

  res.json(tokens);
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  const user = await userQueries.findById(req.userId!);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  res.json(toUserDTO(user));
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const { name, age, gender, weightKg, heightCm, goal, activityLevel, dailyCalorieGoal } = req.body;

  const hasOnboardingFields =
    age !== undefined &&
    weightKg !== undefined &&
    heightCm !== undefined &&
    goal !== undefined &&
    activityLevel !== undefined;

  const updateFields: any = {
    ...(name !== undefined && { name }),
    ...(age !== undefined && { age: Number(age) }),
    ...(gender !== undefined && { gender }),
    ...(weightKg !== undefined && { weight_kg: Number(weightKg) }),
    ...(heightCm !== undefined && { height_cm: Number(heightCm) }),
    ...(goal !== undefined && { goal }),
    ...(activityLevel !== undefined && { activity_level: activityLevel }),
    ...(dailyCalorieGoal !== undefined && { daily_calorie_goal: Number(dailyCalorieGoal) }),
  };

  if (hasOnboardingFields) {
    updateFields.onboarding_completed = true;
    updateFields.onboarding_completed_at = new Date();
  }

  const user = await userQueries.updateProfile(req.userId!, updateFields);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  res.json(toUserDTO(user));
}
