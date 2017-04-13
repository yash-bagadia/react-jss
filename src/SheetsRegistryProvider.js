import React, {Component, Children} from 'react'
import {instanceOf, node} from 'prop-types'
import {SheetsRegistry} from 'jss'

export default class SheetsRegistryProvider extends Component {
  static propTypes = {
    registry: instanceOf(SheetsRegistry).isRequired,
    children: node.isRequired
  }

  static childContextTypes = {
    jssSheetsRegistry: instanceOf(SheetsRegistry).isRequired
  }

  getChildContext() {
    return {
      jssSheetsRegistry: this.props.registry
    }
  }

  render() {
    const {children} = this.props
    return Children.count(children) > 1 ? <div>{children}</div> : children
  }
}

