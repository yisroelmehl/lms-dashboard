import { NextResponse } from "next/server";
import { createUser } from "@/lib/moodle/endpoints";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = url.searchParams.get("u") || "testh" + Date.now();
  const res = await createUser({
    username: user,
    firstname: "משה",
    lastname: "כהן",
    email: user + "@example.com",
    password: "Password1!"
  });
  return NextResponse.json({ id: res });
}
