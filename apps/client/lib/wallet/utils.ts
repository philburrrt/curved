import { split, combine } from "shamir-secret-sharing";

export const toUint8Array = (data: string) => new TextEncoder().encode(data);

const Uint8ArrayToString = (data: Uint8Array) => new TextDecoder().decode(data);

/** SHAMIR SECRET SHARING */

export async function splitKey(pKey: string) {
  const buff = toUint8Array(pKey);
  const keyUint8 = new Uint8Array(buff);
  return (await split(keyUint8, 3, 2)).map((s) =>
    Buffer.from(s).toString("base64")
  );
}

export async function combineKey(share1: string, share2: string) {
  return combine(
    [share1, share2].map((s) => new Uint8Array(Buffer.from(s, "base64")))
  ).then((res: Uint8Array) => Uint8ArrayToString(res) as `0x${string}`);
}

export const getLocalStorage = (key: string) => {
  let currentValue;
  try {
    currentValue = JSON.parse(localStorage.getItem(key) || String(null));
  } catch (error) {
    currentValue = null;
  }

  return currentValue;
};
