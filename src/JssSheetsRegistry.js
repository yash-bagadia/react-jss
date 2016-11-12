import {Component, PropTypes} from 'react'
import {SheetsRegistry} from 'jss'

export default class JssSheetsRegistry extends Component {
  static propTypes = {
    registry: PropTypes.instanceOf(SheetsRegistry).isRequired,
    children: PropTypes.node.isRequired
  }
  static childContextTypes = {
    jssSheetsRegistry: PropTypes.instanceOf(SheetsRegistry).isRequired
  }
  getChildContext() {
    return {
      jssSheetsRegistry: this.props.registry
    }
  }
  render() {
    return this.props.children || null
  }
}

