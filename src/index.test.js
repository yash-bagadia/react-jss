
/* eslint-disable global-require */

import expect from 'expect.js'
import React from 'react'
import {render, unmountComponentAtNode} from 'react-dom'
import deepForceUpdate from 'react-deep-force-update'

const node = document.createElement('div')

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
}

describe('react-jss', () => {
  describe('.create()', () => {
    let localInjectSheet
    let localJss

    beforeEach(() => {
      localJss = createJss()
      localInjectSheet = createInjectSheet(localJss)
    })

    afterEach(reset)

    it('should return a function', () => {
      expect(injectSheet).to.be.a(Function)
    })

    it('should use passed jss', () => {
      let passedJss
      const Component = ({sheet}) => {
        passedJss = sheet.options.jss
        return null
      }
      const WrappedComponent = localInjectSheet()(Component)
      render(<WrappedComponent />, node)
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
    let WrappedComponent

    beforeEach(() => {
      const Component = () => null
      WrappedComponent = injectSheet({
        button: {color: 'red'}
      })(Component)
    })

    afterEach(reset)

    it('should attach and detach a sheet', () => {
      render(<WrappedComponent />, node)
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should reuse one sheet for 2 elements and detach sheet', () => {
      render(<WrappedComponent />, node)
      render(<WrappedComponent />, node)
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })
  })

  describe('.injectSheet() preserving source order', () => {
    let WrappedComponentA
    let WrappedComponentB
    let WrappedComponentC

    beforeEach(() => {
      const Component = () => null
      WrappedComponentA = injectSheet({
        button: {color: 'red'}
      })(Component)
      WrappedComponentB = injectSheet({
        button: {color: 'blue'}
      })(Component)
      WrappedComponentC = injectSheet({
        button: {color: 'green'}
      }, {index: 1234})(Component)
    })

    afterEach(reset)

    it('should provide a default index in ascending order', () => {
      render(<WrappedComponentA />, node)
      expect(sheets.registry.length).to.equal(1)
      const indexA = sheets.registry[0].options.index
      sheets.reset()
      render(<WrappedComponentB />, node)
      expect(sheets.registry.length).to.equal(1)
      const indexB = sheets.registry[0].options.index

      expect(indexA).to.be.lessThan(0)
      expect(indexB).to.be.lessThan(0)
      expect(indexA).to.be.lessThan(indexB)
    })

    it('should not be affected by rendering order', () => {
      render(<WrappedComponentB />, node)
      expect(sheets.registry.length).to.equal(1)
      const indexB = sheets.registry[0].options.index
      sheets.reset()
      render(<WrappedComponentA />, node)
      expect(sheets.registry.length).to.equal(1)
      const indexA = sheets.registry[0].options.index

      expect(indexA).to.be.lessThan(0)
      expect(indexB).to.be.lessThan(0)
      expect(indexA).to.be.lessThan(indexB)
    })

    it('should keep custom index', () => {
      render(<WrappedComponentC />, node)
      expect(sheets.registry.length).to.equal(1)
      const indexC = sheets.registry[0].options.index
      expect(indexC).to.equal(1234)
    })
  })


  describe('.injectSheet() without a component for global styles', () => {
    let Container

    beforeEach(() => {
      Container = injectSheet({
        button: {color: 'red'}
      })()
    })

    afterEach(reset)

    it('should attach and detach a sheet', () => {
      render(<Container />, node)
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should render children', () => {
      let isRendered = true
      const Component = () => {
        isRendered = true
        return null
      }
      render(<Container><Component /></Container>, node)
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

    let WrappedComponentA
    let WrappedComponentB
    let WrappedComponentC

    beforeEach(() => {
      WrappedComponentA = injectSheet({
        button: {color: 'red'}
      })(() => null)

      WrappedComponentB = injectSheet({
        button: {color: 'green'}
      })(() => null)

      WrappedComponentC = injectSheet({
        button: {color: 'blue'}
      })(() => null)
    })

    afterEach(reset)

    it('should hot reload component and attach new sheets', () => {
      const container = render(<WrappedComponentA />, node)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: red')

      simulateHotReloading(container, WrappedComponentA, WrappedComponentB)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: green')

      simulateHotReloading(container, WrappedComponentA, WrappedComponentC)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: blue')
    })

    it('should properly detach sheets on hot reloaded component', () => {
      // eslint-disable-next-line react/prefer-stateless-function
      class AppContainer extends React.Component {
        render() {
          return (
            <WrappedComponentA
              {...this.props}
              key={Math.random()} // Require children to unmount on every render
            />
          )
        }
      }

      const container = render(<AppContainer />, node)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: red')

      simulateHotReloading(container, WrappedComponentA, WrappedComponentB)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: green')

      simulateHotReloading(container, WrappedComponentA, WrappedComponentC)

      expect(document.querySelectorAll('style').length).to.be(1)
      expect(document.querySelectorAll('style')[0].innerHTML).to.contain('color: blue')
    })
  })
  describe('with SheetsRegistryProvider', () => {
    afterEach(reset)

    it('should add style sheets to the registry from context', () => {
      const customSheets = new SheetsRegistry()

      const Component = () => null
      const WrappedComponentA = injectSheet({
        button: {color: 'red'}
      })(Component)
      const WrappedComponentB = injectSheet({
        button: {color: 'blue'}
      })(Component)

      render(
        <SheetsRegistryProvider registry={customSheets}>
          <WrappedComponentA />
          <WrappedComponentB />
        </SheetsRegistryProvider>,
        node
      )

      expect(customSheets.registry.length).to.equal(2)
    })
  })
})
