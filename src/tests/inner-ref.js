/* eslint-disable global-require, react/prop-types */
import expect from 'expect.js'
import React, {PureComponent} from 'react'
import {spy} from 'sinon'

describe('inner ref', () => {
  it('should provide a ref on the inner component', () => {
    const handleRef = spy()

    /* eslint-disable react/no-multi-comp, react/prefer-stateless-function */
    class InnerComponent extends PureComponent {
      render() {
        return (
          <div />
        )
      }
    }
    /* eslint-enable */

    const StyledComponent = injectSheet({})(InnerComponent)
    render(<StyledComponent innerRef={handleRef} />, node)

    expect(handleRef.callCount).to.be(1)
  })
})
