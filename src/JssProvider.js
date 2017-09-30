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
    const {classNamePrefix} = this.props
    let {generateClassName} = this.props

    if (!generateClassName) {
      let createGenerateClassName = createGenerateClassNameDefault
      const {jss: localJss} = this.props
      if (localJss && localJss.options.createGenerateClassName) {
        createGenerateClassName = localJss.options.createGenerateClassName
      }
      generateClassName = createGenerateClassName()
    }

    return {
      [ns.sheetOptions]: {
        generateClassName,
        classNamePrefix
      },
      [ns.providerId]: Math.random(),
      [ns.jss]: this.props.jss,
      [ns.sheetsRegistry]: this.props.registry
    }
  }

  render() {
    return Children.only(this.props.children)
  }
}
