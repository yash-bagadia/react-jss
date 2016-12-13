import React, {Component, PropTypes, Children} from 'react'
import {SheetsRegistry} from 'jss'

export default class SheetsRegistryProvider extends Component {
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
    const {children} = this.props
    return (
      Children.count(children) > 1
        ? <div>{children}</div>
        : children
    )
  }
}

