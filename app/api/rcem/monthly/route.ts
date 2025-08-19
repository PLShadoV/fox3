import { NextResponse } from "next/server";
import data from "@/public/rcem.json";

export async function GET(){
  return NextResponse.json({ ok:true, months: data }, { status:200 });
}
