import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:8081",

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  },

  google: {
    clientId: required("GOOGLE_CLIENT_ID"),
  },

  apple: {
    clientId: required("APPLE_CLIENT_ID"),
    teamId: required("APPLE_TEAM_ID"),
    keyId: required("APPLE_KEY_ID"),
    privateKey: required("APPLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  },

  usda: {
    apiKey: required("USDA_API_KEY"),
  },

} as const;
