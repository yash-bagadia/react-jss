import React, {Component, PropTypes} from 'react'
import {create as createJss, SheetsRegistry, getDynamicStyles} from 'jss'
import preset from 'jss-preset-default'
import hoistNonReactStatics from 'hoist-non-react-statics'
import SheetsRegistryProvider from './SheetsRegistryProvider'

const refNs = `ref-${String(Math.random()).substr(2)}`
const refs = sheet => sheet[refNs] || 0
const dec = sheet => --sheet[refNs]
const inc = sheet => ++sheet[refNs]

/**
 * Adds `composes` property to each top level rule
 * in order to have a composed class name for dynamic style sheets.
 *
 * @param {StyleSheet} staticSheet
 * @param {Object} styles
 * @return {Object|null}
 */
const compose = (staticSheet, styles) => {
  for (const name in styles) {
    const className = staticSheet.classes[name]
    if (!className) break
    styles[name] = {...styles[name], composes: className}
  }
  return styles
}

/**
 * Wrap a Component into a JSS Container Component.
 *
 * @param {Jss} jss
 * @param {Component} WrappedComponent
 * @param {Object|StyleSheet} stylesOrSheet
 * @param {Object} [options]
 * @return {Component}
 */
function wrap(jss, WrappedComponent, stylesOrSheet, options = {}) {
  let styles = stylesOrSheet
  let staticSheet = null
  let dynamicStyles

  // Accept StyleSheet instance.
  if (stylesOrSheet && typeof stylesOrSheet.attach === 'function') {
    staticSheet = stylesOrSheet
    styles = null
  }

  const displayName =
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Component'

  if (!options.meta) options.meta = displayName

  const dynamicSheetOptions = {
    ...options,
    meta: `${options.meta}Dynamic`,
    link: true
  }

  function ref() {
    if (!staticSheet) {
      staticSheet = jss.createStyleSheet(styles, options)
      dynamicStyles = compose(staticSheet, getDynamicStyles(styles))
    }
    if (staticSheet[refNs] === undefined) staticSheet[refNs] = 0
    if (refs(staticSheet) === 0) staticSheet.attach()
    inc(staticSheet)
    return staticSheet
  }

  function deref() {
    if (dec(staticSheet) === 0) staticSheet.detach()
  }

  return class Jss extends Component {
    static wrapped = WrappedComponent
    static displayName = `Jss(${displayName})`
    static contextTypes = {
      jssSheetsRegistry: PropTypes.instanceOf(SheetsRegistry)
    }

    componentWillMount() {
      this.staticSheet = ref()
      if (this.dynamicSheet) this.dynamicSheet.attach()
      else if (dynamicStyles) {
        this.dynamicSheet = jss.createStyleSheet(
          dynamicStyles,
          dynamicSheetOptions
        ).update(this.props).attach()
      }
      const {jssSheetsRegistry} = this.context
      if (jssSheetsRegistry) jssSheetsRegistry.add(this.staticSheet)
    }

    componentWillReceiveProps(nextProps) {
      if (this.dynamicSheet) {
        this.dynamicSheet.update(nextProps)
      }
    }

    componentWillUpdate() {
      if (process.env.NODE_ENV !== 'production') {
        // Support React Hot Loader.
        if (this.staticSheet !== staticSheet) {
          this.staticSheet.detach()
          this.staticSheet = ref()
        }
      }
    }

    componentWillUnmount() {
      if (this.staticSheet && !staticSheet) {
        this.staticSheet.detach()
        const {jssSheetsRegistry} = this.context
        if (jssSheetsRegistry) jssSheetsRegistry.remove(this.staticSheet)
      }
      else deref()
      if (this.dynamicSheet) this.dynamicSheet.detach()
    }

    render() {
      const sheet = this.dynamicSheet || this.staticSheet
      return <WrappedComponent sheet={sheet} classes={sheet.classes} {...this.props} />
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
