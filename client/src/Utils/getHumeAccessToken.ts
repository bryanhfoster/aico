import { fetchAccessToken } from "hume";

export const getHumeAccessToken = async () => {
  const apiKey = import.meta.env.VITE_HUME_API_KEY;
  const secretKey = import.meta.env.VITE_HUME_API_SECRET;

  if (!apiKey || !secretKey) {
    throw new Error('Missing required environment variables (HUME_API_KEY or HUME_SECRET_KEY)');
  }

  const accessToken = await fetchAccessToken({
    apiKey: apiKey,
    secretKey: secretKey,
  });

  if (accessToken === "undefined") {
    throw new Error('Unable to get access token');
  }

  return accessToken ?? null;
};
