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

  getChildContext() {
    const {classNamePrefix, registry, jss: localJss} = this.props
    let {generateClassName} = this.props

    if (!generateClassName) {
      let createGenerateClassName = createGenerateClassNameDefault
      if (localJss && localJss.options.createGenerateClassName) {
        createGenerateClassName = localJss.options.createGenerateClassName
      }
      generateClassName = createGenerateClassName()
    }

    const context = {
      [ns.sheetOptions]: {
        generateClassName,
        classNamePrefix
      },
      [ns.jss]: localJss,
      [ns.sheetsRegistry]: registry
    }

    // This way we identify a new request on the server, because user will create
    // a new Registry instance for each.
    if (registry !== this.context.registry) {
      // We reset managers because we have to regenerate all sheets for the new request.
      context[ns.managers] = {}
    }

    return context
  }

  render() {
    return Children.only(this.props.children)
  }
}
