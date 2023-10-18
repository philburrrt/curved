import { User } from "lucia";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/auth/createUser";
import { validateEthereumAuth } from "@/lib/auth/ethereum";
import { auth } from "@/lib/auth/lucia";
import { AuthMethod, AuthSchema } from "@/lib/auth/types";

import { LoginResponse } from "./types";

/**
 * User login
 */
export async function POST(request: NextRequest) {
  const parsedInput = AuthSchema.safeParse(await request.json());

  if (!parsedInput.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const result = await validateEthereumAuth(request, parsedInput.data);

  if (!result) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let user: User;

  try {
    const key = await auth.useKey(
      AuthMethod.Ethereum,
      result.data.address,
      null,
    );

    user = await auth.getUser(key.userId);
  } catch {
    user = await createUser({
      address: result.data.address,
      providerId: parsedInput.data.method,
      providerUserId: result.data.address,
    });
  }

  const authRequest = auth.handleRequest({ cookies, request });

  const session = await auth.createSession({
    attributes: {},
    userId: user.userId,
  });

  authRequest.setSession(session);

  const json: LoginResponse = { user };
  return NextResponse.json(json);
}
