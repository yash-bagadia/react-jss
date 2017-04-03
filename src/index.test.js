/* eslint-disable global-require */

import expect from 'expect.js'
import React, {PureComponent} from 'react'
import {render, unmountComponentAtNode, findDOMNode} from 'react-dom'
import deepForceUpdate from 'react-deep-force-update'

let node
let jss
let sheets
let createJss
let injectSheet
let createInjectSheet
let reactJss
let SheetsRegistry
let SheetsRegistryProvider

loadModules()

function reloadModules() {
  Object.keys(require.cache).forEach(key => delete require.cache[key])
  loadModules()
}

function loadModules() {
  const jssModule = require('jss')
  jss = jssModule.default
  sheets = jssModule.sheets
  createJss = jssModule.create

  const reactJssModule = require('./')
  injectSheet = reactJssModule.default
  createInjectSheet = reactJssModule.create
  reactJss = reactJssModule.jss
  SheetsRegistry = reactJssModule.SheetsRegistry
  SheetsRegistryProvider = reactJssModule.SheetsRegistryProvider
}

function reset() {
  unmountComponentAtNode(node)
  reloadModules()
  node.parentNode.removeChild(node)
}

describe('react-jss', () => {
  beforeEach(() => {
    node = document.body.appendChild(document.createElement('div'))
  })
  afterEach(reset)

  describe('.create()', () => {
    let localInjectSheet
    let localJss

    beforeEach(() => {
      localJss = createJss()
      localInjectSheet = createInjectSheet(localJss)
    })

    it('should return a function', () => {
      expect(injectSheet).to.be.a(Function)
    })

    it('should use passed jss', () => {
      let passedJss
      const WrappedComponent = ({sheet}) => {
        passedJss = sheet.options.jss
        return null
      }
      const Component = localInjectSheet()(WrappedComponent)
      render(<Component />, node)
      expect(passedJss).to.be(localJss)
    })
  })

  describe('global jss instance', () => {
    it('should return a function', () => {
      expect(injectSheet).to.be.a(Function)
    })

    it('should be available', () => {
      expect(reactJss).to.be.an(jss.constructor)
    })
  })

  describe('.injectSheet()', () => {
    let Component

    beforeEach(() => {
      Component = injectSheet({
        button: {color: 'red'}
      })()
    })

    it('should attach and detach a sheet', () => {
      render(<Component />, node)
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should reuse one sheet for 2 elements and detach sheet', () => {
      render(
        <div>
          <Component />
          <Component />
        </div>,
        node
      )
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })
  })

  describe('.injectSheet() classes prop', () => {
    let passedClasses
    let Component

    beforeEach(() => {
      const WrappedComponent = ({classes}) => {
        passedClasses = classes
        return null
      }
      Component = injectSheet({
        button: {color: 'red'}
      })(WrappedComponent)
    })

    it('should inject classes map as a prop', () => {
      render(<Component />, node)
      expect(passedClasses).to.only.have.keys(['button'])
    })

    it('should not overwrite existing classes property', () => {
      const classes = 'classes prop'
      render(<Component classes={classes} />, node)
      expect(passedClasses).to.equal(classes)
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
    let Component

    beforeEach(() => {
      Component = injectSheet({
        button: {color: 'red'}
      })()
    })

    it('should attach and detach a sheet', () => {
      render(<Component />, node)
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
      render(<Component><ChildComponent /></Component>, node)
      unmountComponentAtNode(node)
      expect(isRendered).to.be(true)
    })
  })

  describe('.injectSheet() hot reloading', () => {
    function simulateHotReloading(container, TargetClass, SourceClass) {
      // Crude imitation of hot reloading that does the job
      Object.getOwnPropertyNames(SourceClass.prototype)
        .filter(key => typeof SourceClass.prototype[key] === 'function')
        .forEach((key) => {
          if (key !== 'render' && key !== 'constructor') {
            TargetClass.prototype[key] = SourceClass.prototype[key]
          }
        })

      deepForceUpdate(container)
    }

    let ComponentA
    let ComponentB
    let ComponentC

    beforeEach(() => {
      ComponentA = injectSheet({
        button: {color: 'red'}
      })(() => null)

      ComponentB = injectSheet({
        button: {color: 'green'}
      })(() => null)

      ComponentC = injectSheet({
        button: {color: 'blue'}
      })(() => null)
    })

    it('should hot reload component and attach new sheets', () => {
      const container = render(<ComponentA />, node)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: red')

      simulateHotReloading(container, ComponentA, ComponentB)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: green')

      simulateHotReloading(container, ComponentA, ComponentC)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: blue')
    })

    it('should properly detach sheets on hot reloaded component', () => {
      // eslint-disable-next-line react/prefer-stateless-function
      class AppContainer extends React.Component {
        render() {
          return (
            <ComponentA
              {...this.props}
              key={Math.random()} // Require children to unmount on every render
            />
          )
        }
      }

      const container = render(<AppContainer />, node)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: red')

      simulateHotReloading(container, ComponentA, ComponentB)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: green')

      simulateHotReloading(container, ComponentA, ComponentC)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: blue')
    })
  })

  describe('.injectSheet() with StyleSheet arg', () => {
    describe('accept StyleSheet', () => {
      let Component

      beforeEach(() => {
        const sheet = reactJss.createStyleSheet({a: {color: 'red'}})
        Component = injectSheet(sheet)()
      })

      it('should attach and detach a sheet', () => {
        render(<Component />, node)
        expect(document.querySelectorAll('style').length).to.be(1)
        unmountComponentAtNode(node)
        expect(document.querySelectorAll('style').length).to.be(0)
      })
    })

    describe('share StyleSheet', () => {
      let Component1
      let Component2

      beforeEach(() => {
        const sheet = reactJss.createStyleSheet({a: {color: 'red'}})
        Component1 = injectSheet(sheet)()
        Component2 = injectSheet(sheet)()
      })

      it('should not detach sheet if it is used in another mounted component', () => {
        const node2 = document.body.appendChild(document.createElement('div'))
        render(<Component1 />, node)
        render(<Component2 />, node2)
        expect(document.querySelectorAll('style').length).to.be(1)
        unmountComponentAtNode(node)
        expect(document.querySelectorAll('style').length).to.be(1)
        unmountComponentAtNode(node2)
        expect(document.querySelectorAll('style').length).to.be(0)
      })
    })
  })

  describe('override sheet prop', () => {
    let Component
    let receivedSheet
    const mock = {}

    beforeEach(() => {
      const WrappedComponent = (props) => {
        receivedSheet = props.sheet
        return null
      }
      Component = injectSheet()(WrappedComponent)
    })

    it('should be able to override the sheet prop', () => {
      const Parent = () => <Component sheet={mock} />
      render(<Parent />, node)
      expect(receivedSheet).to.be(mock)
    })
  })

  describe('with SheetsRegistryProvider', () => {
    it('should add style sheets to the registry from context', () => {
      const customSheets = new SheetsRegistry()

      const ComponentA = injectSheet({
        button: {color: 'red'}
      })()
      const ComponentB = injectSheet({
        button: {color: 'blue'}
      })()

      render(
        <SheetsRegistryProvider registry={customSheets}>
          <ComponentA />
          <ComponentB />
        </SheetsRegistryProvider>,
        node
      )

      expect(customSheets.registry.length).to.equal(2)
    })
  })

  describe('dynamic sheets', () => {
    let Component
    const color = 'rgb(0, 0, 0)'

    beforeEach(() => {
      // eslint-disable-next-line react/prop-types
      const WrappedComponent = ({classes}) =>
        <div className={`${classes.button} ${classes.left}`} />

      Component = injectSheet({
        left: {
          float: 'left'
        },
        button: {
          color,
          height: ({height = 1}) => `${height}px`
        }
      })(WrappedComponent)
    })

    it('should attach and detach a sheet', () => {
      render(<Component />, node)
      expect(document.querySelectorAll('style').length).to.be(2)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should reuse static sheet, but generate separate dynamic once', () => {
      render(
        <div>
          <Component />
          <Component />
        </div>,
        node
      )
      expect(document.querySelectorAll('style').length).to.be(3)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })


    it('should use the default value', () => {
      const node0 = render(<Component />, node)
      const style0 = getComputedStyle(findDOMNode(node0))
      expect(style0.color).to.be(color)
      expect(style0.height).to.be('1px')
    })

    it('should have dynamic and static styles', () => {
      const node0 = render(<Component />, node)
      const style0 = getComputedStyle(findDOMNode(node0))
      expect(style0.color).to.be(color)
      expect(style0.float).to.be('left')
      expect(style0.height).to.be('1px')
    })

    it('should generate different dynamic values', () => {
      const componentNode = render(
        <div>
          <Component height={10} />
          <Component height={20} />
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
      /* eslint-disable react/no-multi-comp, react/prefer-stateless-function, react/prop-types */
      class Container extends PureComponent {
        render() {
          const {height} = this.props
          return (
            <div>
              <Component height={height} />
              <Component height={height * 2} />
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
  })
})
