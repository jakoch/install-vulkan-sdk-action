// Global Jest setup to mock the HTTP client implementation.
// So no real network is used.

// The '@actions/http-client' module is mocked,
// so that when `src/http.ts` constructs the `client` at import time,
// it uses this mocked HttpClient. Its prototype methods are jest.fn.
// This allows tests to spy on `httpm.HttpClient.prototype.get`,`head`,`getJson`.

const proto: Record<string, jest.Mock> = {
  get: jest.fn(),
  head: jest.fn(),
  getJson: jest.fn()
}

class MockHttpClient {
  constructor() {
    // nothing
  }
}

// Attach mocks to prototype
// so that `jest.spyOn(HttpClient.prototype, 'head')` works in tests
// and the instance methods are the same mocks.
;(MockHttpClient.prototype as any).get = proto.get
;(MockHttpClient.prototype as any).head = proto.head
;(MockHttpClient.prototype as any).getJson = proto.getJson

jest.mock('@actions/http-client', () => ({
  HttpClient: MockHttpClient
}))

export {}

// - intercept native http/https to prove tests don't perform real network requests
// - invocation will be recorded to `global.__networkAttempts` and will fail the test
import http from 'node:http'
import https from 'node:https'

;(global as any).__networkAttempts = [] as Array<Record<string, any>>

const makeInterceptor = (mod: any, name: string) => {
  const origRequest = mod.request
  const origGet = mod.get

  function recordAndThrow(options: any, callback?: any) {
    try {
      const url = typeof options === 'string' ? options : options?.href || options?.protocol + '//' + options?.host + (options?.path || '')
      ;(global as any).__networkAttempts.push({ name, options: options, url })
    } catch (e) {
      ;(global as any).__networkAttempts.push({ name, options: 'unserializable' })
    }
    throw new Error(`Network access blocked during tests: attempted ${name} request`)
  }

  // Override request and get
  try {
    mod.request = recordAndThrow
    mod.get = function (options: any, callback?: any) {
      // `get` typically calls `request`
      return recordAndThrow(options, callback)
    }
  } catch (e) {
    // ignore
  }

  // restore originals
  ;(global as any)[`__${name}_orig_request`] = origRequest
  ;(global as any)[`__${name}_orig_get`] = origGet
}

makeInterceptor(http, 'http')
makeInterceptor(https, 'https')
