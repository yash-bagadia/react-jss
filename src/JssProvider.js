import {Component, Children} from 'react'
import {instanceOf, node, func, string} from 'prop-types'
import jss, {
  SheetsRegistry,
  createGenerateClassNameDefault
} from './jss'
import * as ns from './ns'
import contextTypes from './contextTypes'

export default class JssProvider extends Component {
  static propTypes = {
    jss: instanceOf(jss.constructor),
    registry: instanceOf(SheetsRegistry),
    generateClassName: func,
    classNamePrefix: string,
    children: node.isRequired
  }

  static childContextTypes = contextTypes

  static contextTypes = contextTypes

  getChildContext() {
    const {registry, classNamePrefix, jss: localJss, generateClassName} = this.props
    const sheetOptions = this.context[ns.sheetOptions] || {}
    const context = {[ns.sheetOptions]: sheetOptions}

    if (registry) {
      context[ns.sheetsRegistry] = registry
      // This way we identify a new request on the server, because user will create
      // a new Registry instance for each.
      if (registry !== this.context[ns.sheetsRegistry]) {
        // We reset managers because we have to regenerate all sheets for the new request.
        context[ns.managers] = {}
      }
    }

    if (generateClassName) {
      sheetOptions.generateClassName = generateClassName
    }
    else if (!sheetOptions.generateClassName) {
      let createGenerateClassName = createGenerateClassNameDefault
      if (localJss && localJss.options.createGenerateClassName) {
        createGenerateClassName = localJss.options.createGenerateClassName
      }
      sheetOptions.generateClassName = createGenerateClassName()
    }

    if (classNamePrefix) sheetOptions.classNamePrefix = classNamePrefix
    if (localJss) context[ns.jss] = localJss

    return context
  }

  render() {
    return Children.only(this.props.children)
  }
}
