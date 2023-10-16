import { config } from "dotenv";
const { DISCORD_WEBHOOK_URL } = process.env;
config();

export const msgDiscord = async (msg: string) => {
  try {
    fetch(DISCORD_WEBHOOK_URL ?? "", {
      body: JSON.stringify({ content: msg }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch (e: any) {
    console.error(e);
  }
};
