/* eslint-disable global-require, react/prop-types, no-underscore-dangle */

import expect from 'expect.js'
import React from 'react'
import {create} from 'jss'
import {stripIndent} from 'common-tags'
import getDisplayName from './getDisplayName'
import createHoc from './createHoc'
import {createGenerateClassName} from '../tests/helper'

describe('injectSheet', () => {
  let jss

  beforeEach(() => {
    jss = create({createGenerateClassName})
  })

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
    const getInjected = (options, theme = {}, componentProps = {}, bReturnPropsObject = false) => {
      let injectedProps
      const Renderer = (props) => {
        injectedProps = props
        return null
      }
      const MyComponent = injectSheet(() => ({
        button: {color: 'red'}
      }), options)(Renderer)
      render(<ThemeProvider theme={theme}><MyComponent {...componentProps} /></ThemeProvider>, node)
      return bReturnPropsObject ? injectedProps : Object.keys(injectedProps)
    }

    it('should inject all by default', () => {
      expect(getInjected()).to.eql(['theme', 'classes'])
    })

    it('should inject sheet only', () => {
      const reduceProps = (props) => {
        const {sheet} = props
        return {sheet}
      }
      expect(getInjected({reduceProps})).to.eql(['sheet'])
    })

    it('should inject classes only', () => {
      const reduceProps = (props) => {
        const {classes} = props
        return {classes}
      }
      expect(getInjected({reduceProps})).to.eql(['classes'])
    })

    it('should inject theme only', () => {
      const reduceProps = (props) => {
        const {theme} = props
        return {theme}
      }
      expect(getInjected({reduceProps})).to.eql(['theme'])
    })

    it('should inject classes and theme', () => {
      const reduceProps = (props) => {
        const {theme, classes} = props
        return {theme, classes}
      }
      expect(getInjected({reduceProps})).to.eql(['theme', 'classes'])
    })
    it('should inject custom prop from theme', () => {
      const reduceProps = ({sheet, theme, classes, ...rest}) => ({
        ...rest,
        sheet,
        ...theme.ButtonBase,
        classes
      })
      expect(getInjected({reduceProps}, {color: 'red', ButtonBase: {height: 10}})).to.eql(['sheet', 'height', 'classes'])
    })
    it('should reduce props with reduceProp passed to JssProvider', () => {
      const reduceProps = ({sheet, theme, classes, ...rest}) => ({
        ...rest,
        sheet,
        ...theme.ButtonBase,
        classes
      })
      let injectedProps
      const Renderer = (props) => {
        injectedProps = props
        return null
      }
      const MyComponent = injectSheet(() => ({
        button: {color: 'red'}
      }))(Renderer)
      render(<JssProvider reduceProps={reduceProps}><ThemeProvider theme={{color: 'red', ButtonBase: {height: 10}}}><MyComponent /></ThemeProvider></JssProvider>, node)
      expect(injectedProps.height).to.eql(10)
    })
    it('should override themeProps with prop passed to component', () => {
      const reduceProps = ({sheet, theme, classes, ...rest}) => ({
        ...theme.ButtonBase,
        ...rest,
        sheet,
        classes
      })
      const heightProp = getInjected({reduceProps}, {color: 'red', ButtonBase: {height: 10}}, {height: 20}, true).height
      expect(heightProp).to.eql(20)
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

  describe('access inner component', () => {
    it('should be exposed using "InnerComponent" property', () => {
      const ComponentOuter = injectSheet({
        button: {color: 'red'}
      })()
      expect(ComponentOuter.InnerComponent).to.be.a(Function)
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

  describe('classes prop', () => {
    it('should be prefixed by the parent component name', () => {
      let passedClasses
      const InnerComponent = ({classes}) => {
        passedClasses = classes
        return null
      }
      const MyComponent = injectSheet({
        button: {color: 'red'}
      })(InnerComponent)
      render(<MyComponent />, node)
      Object.keys(passedClasses).forEach((ruleName) => {
        expect(passedClasses[ruleName]).to.match(
          new RegExp(`^${getDisplayName(InnerComponent)}-${ruleName}[\\s\\S]*$`)
        )
      })
    })

    it('should use defaultProps.classes from InnerComponent', () => {
      let classes
      const InnerComponent = (props) => {
        classes = props.classes
        return null
      }
      InnerComponent.defaultProps = {
        classes: {default: 'default'}
      }
      const MyComponent = injectSheet({}, {jss})(InnerComponent)
      render(<MyComponent />, node)
      expect(classes).to.eql({default: 'default'})
    })

    it('should merge the defaultProps.classes from InnerComponent', () => {
      let classes
      const InnerComponent = (props) => {
        classes = props.classes
        return null
      }
      InnerComponent.defaultProps = {
        classes: {default: 'default'}
      }
      const MyComponent = injectSheet({
        a: {color: 'red'}
      }, {jss})(InnerComponent)
      render(<MyComponent />, node)
      expect(classes).to.eql({default: 'default', a: 'a-id'})
    })

    it('should merge users classes', () => {
      let classes
      const InnerComponent = (props) => {
        classes = props.classes
        return null
      }
      InnerComponent.defaultProps = {
        classes: {default: 'default'}
      }
      const MyComponent = injectSheet({
        a: {color: 'red'}
      }, {jss})(InnerComponent)
      render(<MyComponent classes={{user: 'user'}} />, node)
      expect(classes).to.eql({default: 'default', a: 'a-id', user: 'user'})
    })
  })

  describe('classNamePrefix', () => {
    let classNamePrefix

    const renderTest = () => {
      const localJss = create({
        createGenerateClassName: () => (rule, sheet) => {
          classNamePrefix = sheet.options.classNamePrefix
          return `${rule.key}-id`
        }
      })
      function DisplayNameTest() {
        return null
      }
      const MyComponent = injectSheet({
        a: {color: 'red'}
      }, {jss: localJss})(DisplayNameTest)
      render(<MyComponent />, node)
    }

    it('should pass displayName as prefix', () => {
      renderTest()
      expect(classNamePrefix).to.be('DisplayNameTest-')
    })

    it.skip('should pass no prefix in production', () => {
      // Rewrire currently doesn't work, most probably because of how we reset
      // the tests #118
      createHoc.__Rewire__('env', 'production')
      renderTest()
      expect(classNamePrefix).to.be(undefined)
      createHoc.__ResetDependency__('env')
    })
  })

  describe('rerender with a new JSS instance when using a ThemeProvider', () => {
    it('should correctly render with a new JSS instance', () => {
      const ComponentA = injectSheet(() => ({a: {left: '2px'}}))()
      const ComponentB = ({localJss}) => (
        <JssProvider jss={localJss}>
          <ThemeProvider theme={{}}>
            <ComponentA />
          </ThemeProvider>
        </JssProvider>
      )
      render(<ComponentB localJss={jss} />, node)

      const newJss = createJss({
        createGenerateClassName,
        plugins: [{
          onProcessStyle: () => ({right: '2px'})
        }]
      })

      render(<ComponentB localJss={newJss} />, node)

      const style = document.querySelectorAll('style')[0]
      expect(style.innerText.trim()).to.be(stripIndent`
        .a-id {
          right: 2px;
        }
      `)
    })
  })
})
