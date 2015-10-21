import React from 'react'
import jss from 'jss'

function decorate(DecoratedComponent, rules, options = {}) {
  let refs = 0
  let sheet = null

  function attach() {
    if (!sheet) sheet = (options.jss || jss).createStyleSheet(rules, options)
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
        // Support React Hot Loader
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

export default function useSheet(rulesOrComponentOrJss) {
  if (rulesOrComponentOrJss instanceof jss.constructor) {
    return (component, rules = {}, options = {}) => {
      if (typeof component != 'function') {
        rules = component
        options = rules
      }
      options.jss = rulesOrComponentOrJss
      return useSheet(component, rules, options)
    }
  }

  if (typeof rulesOrComponentOrJss === 'function') {
    return decorate(...arguments)
  }

  return (DecoratedComponent) => decorate(DecoratedComponent, ...arguments)
}
