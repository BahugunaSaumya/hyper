// src/app/api/me/address/route.ts
// export { GET, PUT, runtime } from "../profile/route";
import { GET as profileGET, PUT as profilePUT } from "../profile/route";

export const GET = profileGET;
export const PUT = profilePUT;

