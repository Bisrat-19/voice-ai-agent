import dotenv from "dotenv";

dotenv.config();

function getEnvOptional(key: string, defaultValue = ""): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  nodeEnv: getEnvOptional("NODE_ENV", "development"),
  port: parseInt(getEnvOptional("PORT", "3000"), 10),
  hostPort: parseInt(getEnvOptional("HOST_PORT", getEnvOptional("PORT", "3000")), 10),
  databaseUrl: getEnvOptional(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/voice_ai"
  ),
};
