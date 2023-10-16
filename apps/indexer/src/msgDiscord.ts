import { config } from "dotenv";
const { DISCORD_WEBHOOK_URL } = process.env;
config();

export const msgDiscord = async (msg: string) => {
  try {
    fetch(DISCORD_WEBHOOK_URL ?? "", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: msg }),
    });
  } catch (e: any) {
    console.error(e);
  }
};
