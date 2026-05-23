import dotenv from "dotenv";

dotenv.config();

function getEnvOptional(key: string, defaultValue = ""): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  nodeEnv: getEnvOptional("NODE_ENV", "development"),
  port: parseInt(getEnvOptional("PORT", "3000"), 10),
  /** Host-mapped port (Docker Compose); defaults to PORT for local dev */
  hostPort: parseInt(getEnvOptional("HOST_PORT", getEnvOptional("PORT", "3000")), 10),
  databaseUrl: getEnvOptional(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/voice_ai"
  ),
};
