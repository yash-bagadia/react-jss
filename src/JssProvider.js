import {Component, Children} from 'react'
import {object, instanceOf, node} from 'prop-types'
import {SheetsRegistry} from 'jss'
import createGenerateClassNameDefault from 'jss/lib/utils/createGenerateClassName'
import jss from './jss'

export default class JssProvider extends Component {
  static propTypes = {
    jss: instanceOf(jss.constructor),
    registry: instanceOf(SheetsRegistry),
    children: node.isRequired
  }

  static childContextTypes = {
    jss: instanceOf(jss.constructor),
    jssSheetOptions: object,
    jssSheetsRegistry: instanceOf(SheetsRegistry)
  }

  getChildContext() {
    let createGenerateClassName = createGenerateClassNameDefault
    const {jss: localJss} = this.props
    if (localJss && localJss.options.createGenerateClassName) {
      createGenerateClassName = localJss.options.createGenerateClassName
    }

    return {
      jssSheetOptions: {
        generateClassName: createGenerateClassName()
      },
      jss: this.props.jss,
      jssSheetsRegistry: this.props.registry
    }
  }

  render() {
    return Children.only(this.props.children)
  }
}
