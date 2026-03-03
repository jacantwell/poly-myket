// Minimal fetch types — available in Node 18+, browsers, and React Native
// We avoid "dom" lib to keep this package DOM-free

declare function fetch(input: string, init?: RequestInit): Promise<Response>;

declare interface RequestInit {
  method?: string;
  headers?: Record<string, string> | Headers;
  body?: string | null;
}

declare interface Response {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

declare interface Headers {
  get(name: string): string | null;
  set(name: string, value: string): void;
}
