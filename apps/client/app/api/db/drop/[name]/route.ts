import { NextRequest } from "next/server";

import { dropTable } from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.nextUrl);
  const tableName = url.pathname.split("/").pop();
  await dropTable(tableName as string);
  return new Response(
    JSON.stringify({
      msg: `Table ${tableName} dropped`,
    }),
    {
      headers: {
        "content-type": "application/json; charset=UTF-8",
      },
    },
  );
}
