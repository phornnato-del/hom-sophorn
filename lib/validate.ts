const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export function isObjectId(id: string): boolean {
  return OBJECT_ID.test(id);
}

export const publicUserFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  image: true,
  createdAt: true,
} as const;