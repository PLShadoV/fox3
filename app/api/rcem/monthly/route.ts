import { ok } from "../../../../lib/utils";
import rcem from "../../../../public/rcem.json";

export async function GET() {
  return ok({ rows: rcem });
}
