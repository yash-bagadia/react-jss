import React from 'react'
import jss from 'jss'

function decorate(DecoratedComponent, rules, options, _jss = jss) {
  let refs = 0
  let sheet = null

  function attach() {
    if (!sheet) sheet = _jss.createStyleSheet(rules, options)
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

  const displayName =
    DecoratedComponent.displayName ||
    DecoratedComponent.name ||
    'Component'

  return class StyleSheetWrapper extends React.Component {
    static wrapped = DecoratedComponent
    static displayName = `JSS(${displayName})`

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
      return <DecoratedComponent {...this.props} sheet={this.sheet} />
    }
  }
}

/**
 * It has 3 different use cases:
 *
 * - binding to a specific jss version `useSheet(jss)`, returns a bound useSheet
 * function, default is the global jss instance
 * - manual decoration `useSheet(Component, rules, options)`
 * - decoration by @decorator, which produces `useSheet(rules, options)(Component)`
 */
export default function useSheet(DecoratedComponent, rules, options) {
  // User creates a useSheet function bound to a specific jss version.
  // DecoratedComponent is Jss instance.
  if (DecoratedComponent instanceof jss.constructor && !rules) {
    return useSheet.bind(DecoratedComponent)
  }

  const _jss = this instanceof jss.constructor ? this : undefined

  // Manually called by user: `useSheet(DecoratedComponent, rules, options)`.
  if (typeof DecoratedComponent === 'function') {
    return decorate(...arguments, _jss)
  }

  // Used as a decorator: `useSheet(rules, options)(DecoratedComponent)`.
  options = rules
  rules = DecoratedComponent

  return (_DecoratedComponent) => decorate(_DecoratedComponent, rules, options, _jss)
}
