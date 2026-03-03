import { setApiUrl } from "poly-myket-shared";
export { api, ApiClientError, setTokenGetter } from "poly-myket-shared";

setApiUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6767");
