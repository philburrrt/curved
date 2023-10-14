import { NextRequest, NextResponse } from "next/server";
// import { auth } from "@clerk/nextjs";
// import { logic } from "db";

const corsHeaders = {
  Accept: "*/*",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const auth = () => {
  // stub of auth middleware from clerk that adds a userId to all requests if they are authenticated.
  return { userId: "foo" };
};

const user = { shamirShard: 'foobar', address: 'foo'}
const logic = {  
  getUser: async (userId: string) => user,
  createUser: async (userObj: any) => {},
  updateUser: async (userId: string, userObj: any) => {}
};

/** necessary for cors pre-flight requests */
export const OPTIONS = async (req: NextRequest): Promise<NextResponse> => {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
};

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json(
      { msg: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }

  const user = await logic.getUser(userId);

  if (!user?.shamirShard)
    return NextResponse.json(
      { success: false, error: "not found" },
      { status: 404, headers: corsHeaders },
    );

  return NextResponse.json(
    { success: true, authShard: user.shamirShard, address: user.address },
    {
      status: 200,
      headers: corsHeaders,
    },
  );
};

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json(
      { msg: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }

  let user = await logic.getUser(userId);
  if (!user) {
    await logic.createUser(userId);
    user = await logic.getUser(userId);
  }

  if (user.address !== null) {
    return NextResponse.json(
      { success: false, error: "user already registered wallet" },
      { status: 401, headers: corsHeaders },
    );
  }

  try {
    const body = await req.json();

    const { shard, address } = body;

    if (!shard || !address) throw new Error("invalid body");

    // todo: encrypt shamirShard
    await logic.updateUser(userId, { shamirShard: shard, address });

    return NextResponse.json(
      { success: true },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    // console.log(error?.message);
    return NextResponse.json(
      { success: false },
      { status: 500, headers: corsHeaders },
    );
  }
};

export const PATCH = async (req: NextRequest): Promise<NextResponse> => {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json(
      { msg: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }

  const user = await logic.getUser(userId);
  if (!user) {
    return NextResponse.json(
      { msg: "ERROR" },
      { status: 500, headers: corsHeaders },
    );
  }

  try {
    const { shard, address } = await req.json();
    if (!shard || !address) throw new Error("invalid body");
    if (address !== user.address) throw new Error("not same address");

    // todo: encrypt shamirShard
    await logic.updateUser(userId, { shamirShard: shard });

    return NextResponse.json(
      { success: true },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false },
      { status: 500, headers: corsHeaders },
    );
  }
};

export const DELETE = async (req: NextRequest): Promise<NextResponse> => {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json(
      { msg: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }

  const user = await logic.getUser(userId);
  if (!user) {
    return NextResponse.json(
      { msg: "ERROR" },
      { status: 500, headers: corsHeaders },
    );
  }

  try {
    // todo: encrypt shamirShard
    await logic.updateUser(userId, { shamirShard: null, address: null });

    return NextResponse.json(
      { success: true },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false },
      { status: 500, headers: corsHeaders },
    );
  }
};
