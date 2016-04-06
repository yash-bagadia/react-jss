import React from 'react'
import jss from 'jss'

function decorate(_jss, DecoratedComponent, rules, options) {
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

export default function useSheet(_jss, DecoratedComponent, rules, options) {
  // User creates a useSheet function bound to a specific jss version.
  if (_jss instanceof jss.constructor && !DecoratedComponent) {
    return useSheet.bind(null, jss)
  }

  // Manually called by user: `useSheet(DecoratedComponent, rules, options)`
  if (typeof DecoratedComponent === 'function') {
    return decorate(...arguments)
  }

  // Used a decorator: `useSheet(rules, options)(DecoratedComponent)`
  rules = DecoratedComponent
  options = rules

  return (_DecoratedComponent) => decorate(_jss, _DecoratedComponent, rules, options)
}
