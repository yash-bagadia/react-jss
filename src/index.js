import React, {Component} from 'react'
import {create as createJss} from 'jss'
import preset from 'jss-preset-default'
import hoistNonReactStatics from 'hoist-non-react-statics'

/**
 * Wrap a Component into a JSS Container Component.
 *
 * @param {Jss} jss
 * @param {Component} WrappedComponent
 * @param {Object} styles
 * @param {Object} [options]
 * @return {Component}
 */
function wrap(jss, WrappedComponent, styles, options = {}) {
  let refs = 0
  let sheet = null

  const displayName =
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Component'

  if (!options.meta) options.meta = displayName

  function attach() {
    if (!sheet) sheet = jss.createStyleSheet(styles, options)
    sheet.attach()
  }

  function detach() {
    sheet.detach()
  }

  function ref() {
    if (refs === 0) attach()
    refs++
    return sheet
  }

  function deref() {
    refs--
    if (refs === 0) detach()
  }

  return class Jss extends Component {
    static wrapped = WrappedComponent
    static displayName = `Jss(${displayName})`

    componentWillMount() {
      this.sheet = ref()
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
      deref()
      this.sheet = null
    }

    render() {
      return <WrappedComponent {...this.props} sheet={this.sheet} />
    }
  }
}

const Container = ({children}) => (children || null)

export const jss = createJss(preset())

/**
 * Create a `injectSheet` function that will use the passed JSS instance.
 *
 * @param {Jss} jss
 * @return {Function}
 * @api public
 */
export function create(localJss = jss) {
  return function injectSheet(styles, options) {
    return (WrappedComponent = Container) => {
      const Jss = wrap(localJss, WrappedComponent, styles, options)
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
