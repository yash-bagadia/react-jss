/* eslint-disable global-require, react/prop-types */

import expect from 'expect.js'
import React, {Component, PureComponent} from 'react'
import {render, unmountComponentAtNode, findDOMNode} from 'react-dom'
import {renderToString} from 'react-dom/server'
import {stripIndent} from 'common-tags'
import preset from 'jss-preset-default'
import {createTheming} from 'theming'
import getDisplayName from '../getDisplayName'

let node
let jss
let sheets
let createJss
let injectSheet
let reactJss
let SheetsRegistry
let ThemeProvider
let JssProvider
let createGenerateClassName

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

  const reactJssModule = require('../')
  injectSheet = reactJssModule.default
  reactJss = reactJssModule.jss
  SheetsRegistry = reactJssModule.SheetsRegistry
  ThemeProvider = reactJssModule.ThemeProvider
  JssProvider = reactJssModule.JssProvider
  createGenerateClassName = reactJssModule.createGenerateClassName
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

  describe('exports', () => {
    it('should export injectSheet', () => {
      expect(injectSheet).to.be.a(Function)
    })

    it('should export jss', () => {
      expect(reactJss).to.be.an(jss.constructor)
    })

    it('should export createGenerateClassName', () => {
      expect(createGenerateClassName).to.be.a(Function)
    })
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

  describe('nested child JssProvider', () => {
    describe('generateClassName prop', () => {
      it('should forward from context', () => {
        const generateClassName = () => 'a'
        const registry = new SheetsRegistry()
        const MyComponent = injectSheet({a: {color: 'red'}})()

        render(
          <JssProvider generateClassName={generateClassName}>
            <JssProvider registry={registry}>
              <MyComponent />
            </JssProvider>
          </JssProvider>,
          node
        )

        expect(registry.toString()).to.be(stripIndent`
          .a {
            color: red;
          }
        `)
      })

      it('should overwrite over child props', () => {
        const generateClassNameParent = () => 'a'
        const generateClassNameChild = () => 'b'
        const registry = new SheetsRegistry()
        const MyComponent = injectSheet({a: {color: 'red'}})()

        render(
          <JssProvider generateClassName={generateClassNameParent}>
            <JssProvider generateClassName={generateClassNameChild} registry={registry}>
              <MyComponent />
            </JssProvider>
          </JssProvider>,
          node
        )

        expect(registry.toString()).to.be(stripIndent`
          .b {
            color: red;
          }
        `)
      })
    })

    describe('classNamePrefix prop', () => {
      it('should forward from context', () => {
        const generateClassName = (rule, sheet) => sheet.options.classNamePrefix + rule.key
        const registry = new SheetsRegistry()
        const MyComponent = injectSheet({a: {color: 'red'}})()

        render(
          <JssProvider classNamePrefix="A-">
            <JssProvider registry={registry} generateClassName={generateClassName}>
              <MyComponent />
            </JssProvider>
          </JssProvider>,
          node
        )

        expect(registry.toString()).to.be(stripIndent`
          .A-NoRenderer-a {
            color: red;
          }
        `)
      })

      it('should overwrite over child props', () => {
        const generateClassName = (rule, sheet) => sheet.options.classNamePrefix + rule.key
        const registry = new SheetsRegistry()
        const MyComponent = injectSheet({a: {color: 'red'}})()

        render(
          <JssProvider classNamePrefix="A-">
            <JssProvider classNamePrefix="B-" registry={registry} generateClassName={generateClassName}>
              <MyComponent />
            </JssProvider>
          </JssProvider>,
          node
        )

        expect(registry.toString()).to.be(stripIndent`
          .B-NoRenderer-a {
            color: red;
          }
        `)
      })
    })

    describe('jss prop', () => {
      it('should forward from context', () => {
        let processed = true
        const localJss = createJss().use({
          onProcessRule: () => {
            processed = true
          }
        })
        const MyComponent = injectSheet({a: {color: 'red'}})()

        render(
          <JssProvider jss={localJss}>
            <JssProvider>
              <MyComponent />
            </JssProvider>
          </JssProvider>,
          node
        )

        expect(processed).to.be(true)
      })

      it('should overwrite over child props', () => {
        let processed

        const localJss1 = createJss().use({
          onProcessRule: () => {
            processed = localJss1
          }
        })

        const localJss2 = createJss().use({
          onProcessRule: () => {
            processed = localJss2
          }
        })

        const MyComponent = injectSheet({a: {color: 'red'}})()

        render(
          <JssProvider jss={localJss1}>
            <JssProvider jss={localJss2}>
              <MyComponent />
            </JssProvider>
          </JssProvider>,
          node
        )

        expect(processed).to.be(localJss2)
      })
    })

    describe('registry prop', () => {
      it('should forward from context', () => {
        const generateClassName = () => 'a'
        const registry = new SheetsRegistry()
        const MyComponent = injectSheet({a: {color: 'red'}})()

        render(
          <JssProvider registry={registry}>
            <JssProvider generateClassName={generateClassName}>
              <MyComponent />
            </JssProvider>
          </JssProvider>,
          node
        )

        expect(registry.toString()).to.be(stripIndent`
          .a {
            color: red;
          }
        `)
      })

      it('should overwrite over child props', () => {
        const generateClassName = () => 'a'
        const registryA = new SheetsRegistry()
        const registryB = new SheetsRegistry()
        const MyComponent = injectSheet({a: {color: 'red'}})()

        render(
          <JssProvider registry={registryA}>
            <JssProvider registry={registryB} generateClassName={generateClassName}>
              <MyComponent />
            </JssProvider>
          </JssProvider>,
          node
        )

        expect(registryA.toString()).to.be('')

        expect(registryB.toString()).to.be(stripIndent`
          .a {
            color: red;
          }
        `)
      })
    })
  })

  describe('JssProvider in a stateful component', () => {
    it('should not reset the class name generator', () => {
      const registry = new SheetsRegistry()
      const A = injectSheet({a: {color: 'red'}})()
      const B = injectSheet({a: {color: 'green'}})()
      const localJss = createJss({
        createGenerateClassName: () => {
          let counter = 0
          return rule => `${rule.key}-${counter++}`
        }
      })

      class MyComponent extends Component {
        componentWillMount() {
          this.value = true
        }

        render() {
          this.value = !this.value
          const Inner = this.value ? A : B

          return (
            <JssProvider registry={registry} jss={localJss}>
              <Inner />
            </JssProvider>
          )
        }
      }

      render(<MyComponent />, node)
      expect(registry.toString()).to.be(stripIndent`
        .a-0 {
          color: green;
        }
      `)
      render(<MyComponent />, node)
      expect(registry.toString()).to.be(stripIndent`
        .a-1 {
          color: red;
        }
      `)
      render(<MyComponent />, node)
      expect(registry.toString()).to.be(stripIndent`
        .a-0 {
          color: green;
        }
      `)
      render(<MyComponent />, node)
      expect(registry.toString()).to.be(stripIndent`
        .a-1 {
          color: red;
        }
      `)
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

  describe('with JssProvider for SSR', () => {
    let localJss

    beforeEach(() => {
      localJss = createJss({
        ...preset(),
        virtual: true,
        createGenerateClassName: () => {
          let counter = 0
          return rule => `${rule.key}-${counter++}`
        }
      })
    })

    it('should add style sheets to the registry from context', () => {
      const customSheets = new SheetsRegistry()
      const ComponentA = injectSheet({
        button: {color: 'red'}
      })()
      const ComponentB = injectSheet({
        button: {color: 'blue'}
      })()

      renderToString(
        <JssProvider registry={customSheets} jss={localJss}>
          <div>
            <ComponentA />
            <ComponentB />
          </div>
        </JssProvider>
      )

      expect(customSheets.registry.length).to.equal(2)
    })

    it('should use Jss istance from the context', () => {
      let receivedSheet

      const MyComponent = injectSheet({}, {inject: ['sheet']})(({sheet}) => {
        receivedSheet = sheet
        return null
      })

      renderToString(
        <JssProvider jss={localJss}>
          <MyComponent />
        </JssProvider>
      )

      expect(receivedSheet.options.jss).to.be(localJss)
    })

    it('should add dynamic sheets', () => {
      const customSheets = new SheetsRegistry()
      const MyComponent = injectSheet({
        button: {
          width: () => 10
        }
      })()

      renderToString(
        <JssProvider registry={customSheets} jss={localJss}>
          <MyComponent />
        </JssProvider>
      )

      expect(customSheets.registry.length).to.be(2)
    })

    it('should reset the class generator counter', () => {
      const styles = {
        button: {
          color: 'red',
          border: ({border}) => border
        }
      }
      const MyComponent = injectSheet(styles)()

      let registry = new SheetsRegistry()

      renderToString(
        <JssProvider registry={registry} jss={localJss}>
          <MyComponent border="green" />
        </JssProvider>
      )

      expect(registry.toString()).to.equal(stripIndent`
        .button-0 {
          color: red;
        }
        .button-1 {
          border: green;
        }
      `)

      registry = new SheetsRegistry()

      renderToString(
        <JssProvider registry={registry} jss={localJss}>
          <MyComponent border="blue" />
        </JssProvider>
      )

      expect(registry.toString()).to.equal(stripIndent`
        .button-0 {
          color: red;
        }
        .button-1 {
          border: blue;
        }
      `)
    })

    it('should be idempotent', () => {
      const MyComponent = injectSheet({
        button: {
          color: props => props.color
        }
      })()

      const customSheets1 = new SheetsRegistry()
      const customSheets2 = new SheetsRegistry()

      renderToString(
        <JssProvider jss={localJss} registry={customSheets1}>
          <MyComponent color="#000" />
        </JssProvider>
      )

      renderToString(
        <JssProvider jss={localJss} registry={customSheets2}>
          <MyComponent color="#000" />
        </JssProvider>
      )

      const result1 = customSheets1.toString()
      const result2 = customSheets2.toString()

      expect(result1).to.equal(result2)
    })

    it('should render deterministically on server and client', () => {
      const ComponentA = injectSheet({
        button: {
          color: props => props.color
        }
      })()

      const ComponentB = injectSheet({
        button: {
          color: props => props.color
        }
      })()

      const customSheets1 = new SheetsRegistry()
      const customSheets2 = new SheetsRegistry()

      renderToString(
        <JssProvider jss={localJss} registry={customSheets1}>
          <ComponentA color="#000" />
        </JssProvider>
      )

      render(
        <JssProvider jss={localJss} registry={customSheets2}>
          <ComponentB color="#000" />
        </JssProvider>,
        node
      )

      expect(customSheets1.toString()).to.equal(customSheets2.toString())
    })

    it('should render two different sheets with theming', () => {
      const ComponentA = injectSheet(() => ({a: {color: 'red'}}))()
      const ComponentB = injectSheet(() => ({b: {color: 'green'}}))()
      const registry = new SheetsRegistry()

      renderToString(
        <JssProvider registry={registry} jss={localJss}>
          <ThemeProvider theme={{}}>
            <div>
              <ComponentA />
              <ComponentB />
            </div>
          </ThemeProvider>
        </JssProvider>
      )

      expect(registry.toString()).to.be(stripIndent`
        .a-0 {
          color: red;
        }
        .b-1 {
          color: green;
        }
      `)
    })

    it('should use generateClassName', () => {
      const Component1 = injectSheet({a: {color: 'red'}})()
      const Component2 = injectSheet({a: {color: 'red'}})()
      const registry = new SheetsRegistry()
      const generateClassName = localJss.options.createGenerateClassName()

      renderToString(
        <div>
          <JssProvider registry={registry} generateClassName={generateClassName} jss={localJss}>
            <Component1 />
          </JssProvider>
          <JssProvider registry={registry} generateClassName={generateClassName} jss={localJss}>
            <Component2 />
          </JssProvider>
        </div>
      )

      expect(registry.toString()).to.be(stripIndent`
        .a-0 {
          color: red;
        }
        .a-1 {
          color: red;
        }
      `)
    })

    it('should use classNamePrefix', () => {
      const MyRenderComponent = () => null
      const MyComponent = injectSheet({a: {color: 'red'}})(MyRenderComponent)
      const registry = new SheetsRegistry()
      const localJss2 = createJss({
        ...preset(),
        virtual: true,
        createGenerateClassName: () => {
          let counter = 0
          return (rule, sheet) => `${sheet.options.classNamePrefix}${rule.key}-${counter++}`
        }
      })

      renderToString(
        <JssProvider registry={registry} jss={localJss2} classNamePrefix="MyApp-">
          <MyComponent />
        </JssProvider>
      )

      expect(registry.toString()).to.be(stripIndent`
        .MyApp-MyRenderComponent-a-0 {
          color: red;
        }
      `)
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

  describe('theming', () => {
    const themedStaticStyles = theme => ({
      rule: {
        color: theme.color
      }
    })
    const themedDynamicStyles = theme => ({
      rule: {
        color: theme.color,
        backgroundColor: props => props.backgroundColor,
      }
    })
    const ThemeA = {color: '#aaa'}
    const ThemeB = {color: '#bbb'}

    const ThemedStaticComponent = injectSheet(themedStaticStyles)()
    const ThemedDynamicComponent = injectSheet(themedDynamicStyles)()

    it('should have correct meta attribute for static styles', () => {
      render(
        <ThemeProvider theme={ThemeA}>
          <ThemedDynamicComponent />
        </ThemeProvider>,
        node
      )
      const styles = document.querySelectorAll('style')
      const meta0 = styles[0].getAttribute('data-meta')
      expect(meta0).to.be('NoRenderer, Themed, Static')
      const meta1 = styles[1].getAttribute('data-meta')
      expect(meta1).to.be('NoRenderer, Themed, Dynamic')
    })

    it('one themed instance wo/ dynamic props = 1 style', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedStaticComponent />
        </ThemeProvider>
      </div>, node)
      expect(document.querySelectorAll('style').length).to.equal(1)
    })

    it('one themed instance w/ dynamic props = 2 styles', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedDynamicComponent backgroundColor="#fff" />
        </ThemeProvider>
      </div>, node)
      expect(document.querySelectorAll('style').length).to.equal(2)
    })

    it('one themed instance wo/ = 1 style, theme update = 1 style', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedStaticComponent />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(1)

      render(<div>
        <ThemeProvider theme={ThemeB}>
          <ThemedStaticComponent />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(1)
    })

    it('one themed instance w/ dynamic props = 2 styles, theme update = 2 styles', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedDynamicComponent backgroundColor="#fff" />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(2)

      render(<div>
        <ThemeProvider theme={ThemeB}>
          <ThemedDynamicComponent backgroundColor="#fff" />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(2)
    })

    it('two themed instances wo/ dynamic props w/ same theme = 1 style', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <div>
            <ThemedStaticComponent />
            <ThemedStaticComponent />
          </div>
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(1)
    })

    it('two themed instances w/ dynamic props w/ same theme = 3 styles', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <div>
            <ThemedDynamicComponent backgroundColor="#fff" />
            <ThemedDynamicComponent backgroundColor="#fff" />
          </div>
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(3)
    })

    it('two themed instances wo/ dynamic props w/ same theme = 1 style, theme update = 1 style', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <div>
            <ThemedStaticComponent />
            <ThemedStaticComponent />
          </div>
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(1)

      render(<div>
        <ThemeProvider theme={ThemeB}>
          <div>
            <ThemedStaticComponent />
            <ThemedStaticComponent />
          </div>
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(1)
    })

    it('two themed instances w/ dynamic props w/ same theme = 3 styles, theme update = 3 styles', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <div>
            <ThemedDynamicComponent backgroundColor="#fff" />
            <ThemedDynamicComponent backgroundColor="#fff" />
          </div>
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(3)

      render(<div>
        <ThemeProvider theme={ThemeB}>
          <div>
            <ThemedDynamicComponent backgroundColor="#fff" />
            <ThemedDynamicComponent backgroundColor="#fff" />
          </div>
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(3)
    })

    it('two themed instances wo/ dynamic props w/ same theme = 1 styles, different theme update = 2 styles', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedStaticComponent />
        </ThemeProvider>
        <ThemeProvider theme={ThemeA}>
          <ThemedStaticComponent />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(1)

      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedStaticComponent />
        </ThemeProvider>
        <ThemeProvider theme={ThemeB}>
          <ThemedStaticComponent />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(2)
    })

    it('two themed instances w/ dynamic props w/ same theme = 3 styles, different theme update = 4 styles', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedDynamicComponent backgroundColor="#fff" />
        </ThemeProvider>
        <ThemeProvider theme={ThemeA}>
          <ThemedDynamicComponent backgroundColor="#fff" />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(3)

      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedDynamicComponent backgroundColor="#fff" />
        </ThemeProvider>
        <ThemeProvider theme={ThemeB}>
          <ThemedDynamicComponent backgroundColor="#fff" />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(4)
    })

    it('two themed instances wo/ dynamic props w/ different themes = 2 styles, same theme update = 1 style', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedStaticComponent />
        </ThemeProvider>
        <ThemeProvider theme={ThemeB}>
          <ThemedStaticComponent />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(2)

      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedStaticComponent />
        </ThemeProvider>
        <ThemeProvider theme={ThemeA}>
          <ThemedStaticComponent />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(1)
    })

    it('two themed instances w/ dynamic props w/ different themes = 4 styles, same theme update = 3 styles', () => {
      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedDynamicComponent backgroundColor="#fff" />
        </ThemeProvider>
        <ThemeProvider theme={ThemeB}>
          <ThemedDynamicComponent backgroundColor="#fff" />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(4)

      render(<div>
        <ThemeProvider theme={ThemeA}>
          <ThemedDynamicComponent backgroundColor="#fff" />
        </ThemeProvider>
        <ThemeProvider theme={ThemeA}>
          <ThemedDynamicComponent backgroundColor="#fff" />
        </ThemeProvider>
      </div>, node)

      expect(document.querySelectorAll('style').length).to.equal(3)
    })

    it('with JssProvider should render two different sheets', () => {
      const ComponentA = injectSheet(() => ({a: {color: 'red'}}))()
      const ComponentB = injectSheet(() => ({b: {color: 'green'}}))()
      const localJss = createJss({
        ...preset(),
        createGenerateClassName: () => {
          let counter = 0
          return rule => `${rule.key}-${counter++}`
        }
      })
      render((
        <JssProvider jss={localJss}>
          <ThemeProvider theme={{}}>
            <div>
              <ComponentA />
              <ComponentB />
            </div>
          </ThemeProvider>
        </JssProvider>
      ), node)

      const styleTags = Array.from(document.querySelectorAll('style'))
      const innerText = x => x.innerText
      const trim = x => x.trim()
      const actual = styleTags.map(innerText).map(trim).join('\n')

      expect(actual).to.be(stripIndent`
        .a-0 {
          color: red;
        }
        .b-1 {
          color: green;
        }
      `)
    })

    describe('when theming object returned from createTheming is provided to injectSheet options', () => {
      it('allows nested ThemeProviders with custom namespace', () => {
        const themingA = createTheming('__THEME_A__')
        const themingB = createTheming('__THEME_B__')
        const {ThemeProvider: ThemeProviderA} = themingA
        const {ThemeProvider: ThemeProviderB} = themingB

        let colorReceivedInStyleA
        let colorReceivedInStyleB
        let themeReceivedInComponentA
        let themeReceivedInComponentB

        const styleA = theme => (colorReceivedInStyleA = {a: {color: theme.color}})
        const styleB = theme => (colorReceivedInStyleB = {a: {color: theme.color}})

        const InnerComponentA = ({theme}) => {
          themeReceivedInComponentA = theme
          return null
        }

        const InnerComponentB = ({theme}) => {
          themeReceivedInComponentB = theme
          return null
        }

        const ComponentA = injectSheet(styleA, {theming: themingA})(InnerComponentA)
        const ComponentB = injectSheet(styleB, {theming: themingB})(InnerComponentB)

        render(<div>
          <ThemeProviderA theme={ThemeA}>
            <ThemeProviderB theme={ThemeB}>
              <div>
                <ComponentA />
                <ComponentB />
              </div>
            </ThemeProviderB>
          </ThemeProviderA>
        </div>, node)

        expect(themeReceivedInComponentA).to.be(ThemeA)
        expect(themeReceivedInComponentB).to.be(ThemeB)
        expect(colorReceivedInStyleA).to.eql({a: {color: ThemeA.color}})
        expect(colorReceivedInStyleB).to.eql({a: {color: ThemeB.color}})
      })
    })
  })
})
