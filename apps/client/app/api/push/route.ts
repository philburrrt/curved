import { sendNotification } from "@/lib/push/webpush";
export function GET() {
  sendNotification("0x659b8aC78bf3428077529ef9E1cCa22B1d711FFD".toLowerCase(), {
    body: "Hello, world!",
    icon: "/images/android-chrome-192x192.png",
    title: "Hello",
    url: "/",
  });

  return new Response("OK");
}
