/*-----------------------------------------------------------------------------
 *  SPDX-FileCopyrightText: 2021-2026 Jens A. Koch
 *  SPDX-License-Identifier: MIT
 *----------------------------------------------------------------------------*/

import { handleError } from '../src/errors'
import * as core from '@actions/core'

jest.mock('@actions/core')

describe('handleError', () => {
  it('should call core.setFailed with the error stack', () => {
    const error = new Error('Test error')
    error.stack = 'Error stack'
    handleError(error)
    expect(core.setFailed).toHaveBeenCalledWith('Error stack')
  })

  it('should call core.setFailed with the error message if stack is not available', () => {
    const error = new Error('Test error')
    error.stack = undefined
    handleError(error)
    expect(core.setFailed).toHaveBeenCalledWith('Test error')
  })

  it('should call core.setFailed with the error string if stack and message are not available', () => {
    const error = new Error()
    error.stack = undefined
    error.message = ''
    handleError(error)
    expect(core.setFailed).toHaveBeenCalledWith(String(error))
  })
})
