/* eslint-disable global-require, react/prop-types */

import expect from 'expect.js'
import React, {PureComponent} from 'react'
import {render, unmountComponentAtNode, findDOMNode} from 'react-dom'
import getDisplayName from '../getDisplayName'
import '../../tests-helper'

describe('Integration: main', () => {
  describe('.injectSheet()', () => {
    let MyComponent

    beforeEach(() => {
      MyComponent = injectSheet({
        button: {color: 'red'}
      })()
    })

    it('should attach and detach a sheet', () => {
      render(<MyComponent />, node)
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should reuse one sheet for many elements and detach sheet', () => {
      render(
        <div>
          <MyComponent />
          <MyComponent />
          <MyComponent />
        </div>,
        node
      )
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should reuse one sheet for many elements wrapped into a JssProvider', () => {
      render(
        <div>
          <JssProvider>
            <MyComponent />
          </JssProvider>
          <JssProvider>
            <MyComponent />
          </JssProvider>
        </div>,
        node
      )
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should have correct meta attribute', () => {
      render(<MyComponent />, node)
      const meta = document.querySelector('style').getAttribute('data-meta')
      expect(meta).to.be('NoRenderer, Unthemed, Static')
    })
  })

  describe('injectSheet() option "inject"', () => {
    const getInjected = (options) => {
      let injectedProps
      const Renderer = (props) => {
        injectedProps = props
        return null
      }
      const MyComponent = injectSheet(() => ({
        button: {color: 'red'}
      }), options)(Renderer)
      render(<ThemeProvider theme={{}}><MyComponent /></ThemeProvider>, node)
      return Object.keys(injectedProps)
    }

    it('should inject all by default', () => {
      expect(getInjected()).to.eql(['classes', 'theme'])
    })

    it('should inject sheet only', () => {
      expect(getInjected({inject: ['sheet']})).to.eql(['sheet'])
    })

    it('should inject classes only', () => {
      expect(getInjected({inject: ['classes']})).to.eql(['classes'])
    })

    it('should inject theme only', () => {
      expect(getInjected({inject: ['theme']})).to.eql(['theme'])
    })

    it('should inject classes and theme', () => {
      expect(getInjected({inject: ['classes', 'theme']})).to.eql(['classes', 'theme'])
    })
  })

  describe('.injectSheet() classes prop', () => {
    let passedClasses
    let InnerComponent
    let MyComponent

    beforeEach(() => {
      InnerComponent = ({classes}) => {
        passedClasses = classes
        return null
      }
      MyComponent = injectSheet({
        button: {color: 'red'}
      })(InnerComponent)
    })

    it('should inject classes map as a prop', () => {
      render(<MyComponent />, node)
      expect(passedClasses).to.only.have.keys(['button'])
    })

    it('should not overwrite existing classes property', () => {
      const classes = 'classes prop'
      render(<MyComponent classes={classes} />, node)
      expect(passedClasses).to.equal(classes)
    })

    it('should be prefixed by the parent injected component\'s name', () => {
      render(<MyComponent />, node)
      Object.keys(passedClasses).forEach((ruleName) => {
        expect(passedClasses[ruleName]).to.match(
          new RegExp(`^${getDisplayName(InnerComponent)}-${ruleName}[\\s\\S]*$`)
        )
      })
    })
  })

  describe('.injectSheet() preserving source order', () => {
    let ComponentA
    let ComponentB
    let ComponentC

    beforeEach(() => {
      ComponentA = injectSheet({
        button: {color: 'red'}
      })()
      ComponentB = injectSheet({
        button: {color: 'blue'}
      })()
      ComponentC = injectSheet({
        button: {color: 'green'}
      }, {index: 1234})()
    })

    it('should provide a default index in ascending order', () => {
      render(<ComponentA />, node)
      expect(sheets.registry.length).to.equal(1)
      const indexA = sheets.registry[0].options.index
      sheets.reset()
      render(<ComponentB />, node)
      expect(sheets.registry.length).to.equal(1)
      const indexB = sheets.registry[0].options.index

      expect(indexA).to.be.lessThan(0)
      expect(indexB).to.be.lessThan(0)
      expect(indexA).to.be.lessThan(indexB)
    })

    it('should not be affected by rendering order', () => {
      render(<ComponentB />, node)
      expect(sheets.registry.length).to.equal(1)
      const indexB = sheets.registry[0].options.index
      sheets.reset()
      render(<ComponentA />, node)
      expect(sheets.registry.length).to.equal(1)
      const indexA = sheets.registry[0].options.index

      expect(indexA).to.be.lessThan(0)
      expect(indexB).to.be.lessThan(0)
      expect(indexA).to.be.lessThan(indexB)
    })

    it('should keep custom index', () => {
      render(<ComponentC />, node)
      expect(sheets.registry.length).to.equal(1)
      const indexC = sheets.registry[0].options.index
      expect(indexC).to.equal(1234)
    })
  })

  describe('.injectSheet() without a component for global styles', () => {
    let MyComponent

    beforeEach(() => {
      MyComponent = injectSheet({
        button: {color: 'red'}
      })()
    })

    it('should attach and detach a sheet', () => {
      render(<MyComponent />, node)
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should render children', () => {
      let isRendered = true
      const ChildComponent = () => {
        isRendered = true
        return null
      }
      render(<MyComponent><ChildComponent /></MyComponent>, node)
      unmountComponentAtNode(node)
      expect(isRendered).to.be(true)
    })
  })

  describe('override sheet prop', () => {
    let MyComponent
    let receivedSheet
    const mock = {}

    beforeEach(() => {
      const InnerComponent = (props) => {
        receivedSheet = props.sheet
        return null
      }
      MyComponent = injectSheet()(InnerComponent)
    })

    it('should be able to override the sheet prop', () => {
      const Parent = () => <MyComponent sheet={mock} />
      render(<Parent />, node)
      expect(receivedSheet).to.be(mock)
    })
  })

  describe('access inner component', () => {
    it('should be exposed using "InnerComponent" property', () => {
      const ComponentOuter = injectSheet({
        button: {color: 'red'}
      })()
      expect(ComponentOuter.InnerComponent).to.be.a(Function)
    })
  })

  describe('function values', () => {
    const color = 'rgb(0, 0, 0)'
    let MyComponent

    beforeEach(() => {
      const InnerComponent = ({classes}) => (
        <div className={`${classes.button} ${classes.left}`} />
      )

      MyComponent = injectSheet({
        left: {
          float: 'left'
        },
        button: {
          color,
          height: ({height = 1}) => height
        }
      })(InnerComponent)
    })

    it('should attach and detach a sheet', () => {
      render(<MyComponent />, node)
      expect(document.querySelectorAll('style').length).to.be(2)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should have correct meta attribute', () => {
      render(<MyComponent />, node)
      const styles = document.querySelectorAll('style')
      const meta0 = styles[0].getAttribute('data-meta')
      const meta1 = styles[1].getAttribute('data-meta')
      expect(meta0).to.be('InnerComponent, Unthemed, Static')
      expect(meta1).to.be('InnerComponent, Unthemed, Dynamic')
    })

    it('should reuse static sheet, but generate separate dynamic once', () => {
      render(
        <div>
          <MyComponent height={2} />
          <MyComponent height={3} />
        </div>,
        node
      )
      expect(document.querySelectorAll('style').length).to.be(3)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should use the default value', () => {
      const node0 = render(<MyComponent />, node)
      const style0 = getComputedStyle(findDOMNode(node0))
      expect(style0.color).to.be(color)
      expect(style0.height).to.be('1px')
    })

    it('should have dynamic and static styles', () => {
      const node0 = render(<MyComponent />, node)
      const style0 = getComputedStyle(findDOMNode(node0))
      expect(style0.color).to.be(color)
      expect(style0.float).to.be('left')
      expect(style0.height).to.be('1px')
    })

    it('should generate different dynamic values', () => {
      const componentNode = render(
        <div>
          <MyComponent height={10} />
          <MyComponent height={20} />
        </div>,
        node
      )
      const [node0, node1] = componentNode.children
      const style0 = getComputedStyle(node0)
      const style1 = getComputedStyle(node1)

      expect(style0.color).to.be(color)
      expect(style0.height).to.be('10px')
      expect(style1.color).to.be(color)
      expect(style1.height).to.be('20px')
    })

    it('should update dynamic values', () => {
      /* eslint-disable react/no-multi-comp, react/prefer-stateless-function */
      class Container extends PureComponent {
        render() {
          const {height} = this.props
          return (
            <div>
              <MyComponent height={height} />
              <MyComponent height={height * 2} />
            </div>
          )
        }
      }
      /* eslint-enable */

      const component = render(<Container height={10} />, node)
      const componentNode = findDOMNode(component)
      const [node0, node1] = componentNode.children
      const style0 = getComputedStyle(node0)
      const style1 = getComputedStyle(node1)

      expect(style0.color).to.be(color)
      expect(style0.height).to.be('10px')
      expect(style1.color).to.be(color)
      expect(style1.height).to.be('20px')

      render(<Container height={20} />, node)

      expect(style0.color).to.be(color)
      expect(style0.height).to.be('20px')
      expect(style1.color).to.be(color)
      expect(style1.height).to.be('40px')

      expect(document.querySelectorAll('style').length).to.be(3)
    })

    it('should use the default props', () => {
      const styles = {
        a: {
          color: props => props.color
        }
      }
      const InnerComponent = ({classes}) => <span className={classes.a} />
      InnerComponent.defaultProps = {
        color: 'rgb(255, 0, 0)'
      }
      const StyledComponent = injectSheet(styles)(InnerComponent)

      const node0 = render(<StyledComponent />, node)
      const style0 = getComputedStyle(findDOMNode(node0))
      expect(style0.color).to.be('rgb(255, 0, 0)')
    })
  })
})
