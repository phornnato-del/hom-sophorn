import { NextResponse } from "next/server";

export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T | null;
};

export function ok<T>(data: T, message = "Success", status = 200) {
  const body: ApiResponse<T> = { code: status, message, data };
  return NextResponse.json(body, { status });
}

export function fail(message: string, status = 500) {
  const body: ApiResponse<null> = { code: status, message, data: null };
  return NextResponse.json(body, { status });
}