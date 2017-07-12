import {Component, Children} from 'react'
import {instanceOf, node} from 'prop-types'
import jss, {
  SheetsRegistry,
  SheetsManager,
  createGenerateClassNameDefault
} from './jss'
import * as ns from './ns'
import contextTypes from './contextTypes'

export default class JssProvider extends Component {
  static propTypes = {
    jss: instanceOf(jss.constructor),
    registry: instanceOf(SheetsRegistry),
    children: node.isRequired
  }

  static childContextTypes = contextTypes

  getChildContext() {
    let createGenerateClassName = createGenerateClassNameDefault
    const {jss: localJss} = this.props
    if (localJss && localJss.options.createGenerateClassName) {
      createGenerateClassName = localJss.options.createGenerateClassName
    }
    return {
      [ns.sheetOptions]: {
        generateClassName: createGenerateClassName()
      },
      [ns.sheetsManager]: new SheetsManager(),
      [ns.jss]: this.props.jss,
      [ns.sheetsRegistry]: this.props.registry
    }
  }

  render() {
    return Children.only(this.props.children)
  }
}
