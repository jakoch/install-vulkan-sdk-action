import { jest } from '@jest/globals';

export interface HttpClientResponse {
  message: { statusCode: number | undefined }
  readBody: () => Promise<string>
}

export const proto: Record<string, jest.Mock> = {
  get: jest.fn(),
  head: jest.fn(),
  getJson: jest.fn()
}

export class HttpClient {
  constructor() {
    // nothing
  }
}

;(HttpClient.prototype as any).get = proto.get
;(HttpClient.prototype as any).head = proto.head
;(HttpClient.prototype as any).getJson = proto.getJson
