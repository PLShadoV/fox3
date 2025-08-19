export function toISODate(dateStr?: string) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) throw new Error("Invalid date");
  return d.toISOString().slice(0,10);
}

export function ok(data: any) {
  return Response.json({ ok: true, ...data }, { status: 200 });
}

export function bad(message: string) {
  return Response.json({ ok: false, error: message }, { status: 200 });
}
