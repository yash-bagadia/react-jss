import {Component, Children} from 'react'
import {instanceOf, node} from 'prop-types'
import jss, {SheetsRegistry} from 'jss'

export default class JssProvider extends Component {
  static propTypes = {
    jss: instanceOf(jss.constructor),
    registry: instanceOf(SheetsRegistry),
    children: node.isRequired
  }

  static childContextTypes = {
    jss: instanceOf(jss.constructor),
    jssSheetsRegistry: instanceOf(SheetsRegistry)
  }

  getChildContext() {
    return {
      jss: this.props.jss,
      jssSheetsRegistry: this.props.registry
    }
  }

  render() {
    return Children.only(this.props.children)
  }
}
