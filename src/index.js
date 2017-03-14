import React, {Component, PropTypes} from 'react'
import {create as createJss, SheetsRegistry} from 'jss'
import preset from 'jss-preset-default'
import hoistNonReactStatics from 'hoist-non-react-statics'
import SheetsRegistryProvider from './SheetsRegistryProvider'

const refNs = `ref-${String(Math.random()).substr(2)}`
const refs = sheet => sheet[refNs] || 0
const dec = sheet => --sheet[refNs]
const inc = sheet => ++sheet[refNs]

/**
 * Wrap a Component into a JSS Container Component.
 *
 * @param {Jss} jss
 * @param {Component} WrappedComponent
 * @param {Object} stylesOrSheet
 * @param {Object} [options]
 * @return {Component}
 */
function wrap(jss, WrappedComponent, stylesOrSheet, options = {}) {
  let sheet = null
  let styles = stylesOrSheet

  // Accept StyleSheet instance.
  if (stylesOrSheet && typeof stylesOrSheet.attach === 'function') {
    sheet = stylesOrSheet
    styles = null
  }

  const displayName =
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Component'

  if (!options.meta) options.meta = displayName

  function ref() {
    if (!sheet) sheet = jss.createStyleSheet(styles, options)
    if (sheet[refNs] === undefined) sheet[refNs] = 0
    if (refs(sheet) === 0) sheet.attach()
    inc(sheet)
    return sheet
  }

  function deref() {
    if (dec(sheet) === 0) sheet.detach()
  }

  return class Jss extends Component {
    static wrapped = WrappedComponent
    static displayName = `Jss(${displayName})`
    static contextTypes = {
      jssSheetsRegistry: PropTypes.instanceOf(SheetsRegistry)
    }

    componentWillMount() {
      this.sheet = ref()
      const {jssSheetsRegistry} = this.context
      if (jssSheetsRegistry) jssSheetsRegistry.add(this.sheet)
    }

    componentWillUpdate() {
      if (process.env.NODE_ENV !== 'production') {
        // Support React Hot Loader.
        if (this.sheet !== sheet) {
          this.sheet.detach()
          this.sheet = ref()
        }
      }
    }

    componentWillUnmount() {
      if (this.sheet && !sheet) {
        this.sheet.detach()
        const {jssSheetsRegistry} = this.context
        if (jssSheetsRegistry) jssSheetsRegistry.remove(this.sheet)
      }
      else deref()
    }

    render() {
      return <WrappedComponent sheet={this.sheet} classes={this.sheet.classes} {...this.props} />
    }
  }
}

const Container = ({children}) => (children || null)

export const jss = createJss(preset())

/**
 * Global index counter to preserve source order.
 * As we create the style sheet during componentWillMount lifecycle,
 * children are handled after the parents, so the order of style elements would
 * be parent->child. It is a problem though when a parent passes a className
 * which needs to override any childs styles. StyleSheet of the child has a higher
 * specificity, because of the source order.
 * So our solution is to render sheets them in the reverse order child->sheet, so
 * that parent has a higher specificity.
 *
 * @type {Number}
 */
let indexCounter = -100000

/**
 * Create a `injectSheet` function that will use the passed JSS instance.
 *
 * @param {Jss} jss
 * @return {Function}
 * @api public
 */
export function create(localJss = jss) {
  return function injectSheet(stylesOrSheet, options = {}) {
    if (options.index === undefined) {
      options.index = indexCounter++
    }
    return (WrappedComponent = Container) => {
      const Jss = wrap(localJss, WrappedComponent, stylesOrSheet, options)
      return hoistNonReactStatics(Jss, WrappedComponent, {wrapped: true})
    }
  }
}

/**
 * Exports injectSheet function as default.
 * Returns a function which needs to be invoked with a Component.
 *
 * `injectSheet(styles, [options])(Component)`
 *
 * @param {Object} styles
 * @param {Object} [options]
 * @return {Function}
 * @api public
 */
export default create()

export {SheetsRegistryProvider}

export {SheetsRegistry}
