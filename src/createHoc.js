import React, {Component} from 'react'
import {instanceOf} from 'prop-types'
import {SheetsRegistry, getDynamicStyles} from 'jss'
import jss from './jss'
import compose from './compose'
import getDisplayName from './getDisplayName'

const refNs = `ref-${String(Math.random()).substr(2)}`
const refs = sheet => sheet[refNs] || 0
const dec = sheet => --sheet[refNs]
const inc = sheet => ++sheet[refNs]

/**
 * Wrap a Component into a JSS Container Component.
 *
 * @param {Component} InnerComponent
 * @param {Object|StyleSheet} stylesOrSheet
 * @param {Object} [options]
 * @return {Component}
 */
export default (stylesOrSheet, InnerComponent, options = {}) => {
  let styles = stylesOrSheet
  let staticSheet = null
  let dynamicStyles

  // Accept StyleSheet instance.
  if (stylesOrSheet && typeof stylesOrSheet.attach === 'function') {
    staticSheet = stylesOrSheet
    styles = null
  }

  const displayName = getDisplayName(InnerComponent)

  if (!options.meta) options.meta = displayName

  const dynamicSheetOptions = {
    ...options,
    meta: `${options.meta}Dynamic`,
    link: true
  }

  function ref(localJss) {
    if (!staticSheet) {
      staticSheet = localJss.createStyleSheet(styles, options)
      dynamicStyles = compose(staticSheet, getDynamicStyles(styles))
    }
    if (staticSheet[refNs] === undefined) staticSheet[refNs] = 0
    if (refs(staticSheet) === 0) staticSheet.attach()
    inc(staticSheet)
    return staticSheet
  }

  function deref() {
    if (dec(staticSheet) === 0) staticSheet.detach()
  }

  return class Jss extends Component {
    static InnerComponent = InnerComponent

    static displayName = `Jss(${displayName})`

    static contextTypes = {
      jss: instanceOf(jss.constructor),
      jssSheetsRegistry: instanceOf(SheetsRegistry)
    }

    static defaultProps = InnerComponent.defaultProps

    componentWillMount() {
      this.staticSheet = ref(this.getJss())
      if (this.dynamicSheet) this.dynamicSheet.attach()
      else if (dynamicStyles) {
        this.dynamicSheet = jss
          .createStyleSheet(dynamicStyles, dynamicSheetOptions)
          .update(this.props)
          .attach()
      }
      const {jssSheetsRegistry} = this.context
      if (jssSheetsRegistry) jssSheetsRegistry.add(this.staticSheet)
    }

    componentWillReceiveProps(nextProps) {
      if (this.dynamicSheet) {
        this.dynamicSheet.update(nextProps)
      }
    }

    componentWillUpdate() {
      if (process.env.NODE_ENV !== 'production') {
        // Support React Hot Loader.
        if (this.staticSheet !== staticSheet) {
          this.staticSheet.detach()
          this.staticSheet = ref(this.getJss())
        }
      }
    }

    componentWillUnmount() {
      if (this.staticSheet && !staticSheet) {
        this.staticSheet.detach()
        const {jssSheetsRegistry} = this.context
        if (jssSheetsRegistry) jssSheetsRegistry.remove(this.staticSheet)
      }
      else deref()
      if (this.dynamicSheet) this.dynamicSheet.detach()
    }

    getJss() {
      const {jss: contextJss} = this.context
      if (contextJss) return contextJss
      return jss
    }

    render() {
      const sheet = this.dynamicSheet || this.staticSheet
      return <InnerComponent sheet={sheet} classes={sheet.classes} {...this.props} />
    }
  }
}
