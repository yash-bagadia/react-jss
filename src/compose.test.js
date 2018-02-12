import expect from 'expect.js'
import compose from './compose'

describe('compose', () => {
  it('should compose fn values', () => {
    const height = () => {}
    const classes = {left: 'a', button: 'b'}
    const styles = {button: {height}}
    const composed = compose(classes, styles)
    expect(composed).to.eql({
      button: {
        height,
        composes: 'b'
      },
      left: {
        composes: 'a'
      }
    })
  })

  it('should compose fn rules', () => {
    const rule = () => {}
    const classes = {left: 'a', button: 'b'}
    const styles = {button: rule}
    const composed = compose(classes, styles)
    expect(composed).to.eql({
      button: {
        extend: rule,
        composes: 'b'
      },
      left: {
        composes: 'a'
      }
    })
  })
})
