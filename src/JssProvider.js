import React, {Component, Children} from 'react'
import {instanceOf, node} from 'prop-types'
import jss, {SheetsRegistry} from 'jss'

export default class JssProvider extends Component {
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
    return Children.only(this.props.children)
  }
}
