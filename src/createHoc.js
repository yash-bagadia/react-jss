import React, {Component} from 'react'
import {object, instanceOf} from 'prop-types'
import {themeListener} from '@iamstarkov/theming-w-listener'
import jss, {SheetsRegistry, getDynamicStyles, SheetsManager} from './jss'
import compose from './compose'
import getDisplayName from './getDisplayName'

// Like a Symbol
const dynamicStylesNs = Math.random()

/*
 * # Use cases
 *
 * - Unthemed component accepts styles object
 * - Themed component accepts styles creator function which takes theme as a single argument
 * - Multiple instances will re-use the same static sheet via sheets manager
 * - Sheet manager identifies static sheets by theme as a key
 * - For unthemed components theme is an empty object
 * - The very first instance will add static sheet to sheets manager
 * - Every further instances will get that static sheet from sheet manager
 * - Every mount of every instance will call method `sheetsManager.manage`,
 * thus incrementing reference counter.
 * - Every unmount of every instance will call method `sheetsManager.unmanage`,
 * thus decrementing reference counter.
 * - `sheetsManager.unmanage` under the hood will detach static sheet once reference
 * counter is zero.
 * - Dynamic styles are not shared between instances
 *
 */

const getStyles = (stylesOrCreator, theme) => {
  if (typeof stylesOrCreator !== 'function') {
    return stylesOrCreator
  }
  return stylesOrCreator(theme)
}

/**
 * Wrap a Component into a JSS Container Component.
 *
 * @param {Object|Function} stylesOrCreator
 * @param {Component} InnerComponent
 * @param {Object} [options]
 * @return {Component}
 */
export default (stylesOrCreator, InnerComponent, options = {}) => {
  const isThemingEnabled = typeof stylesOrCreator === 'function'

  const displayName = `Jss(${getDisplayName(InnerComponent)})`
  const manager = new SheetsManager()
  const noTheme = {}

  if (!options.meta) options.meta = displayName

  return class Jss extends Component {
    static displayName = displayName
    static InnerComponent = InnerComponent
    static contextTypes = {
      jss: instanceOf(jss.constructor),
      jssSheetOptions: object,
      jssSheetsRegistry: instanceOf(SheetsRegistry),
      jssSheetsManager: instanceOf(SheetsManager),
      ...(isThemingEnabled && themeListener.contextTypes)
    }
    static defaultProps = InnerComponent.defaultProps

    constructor(props, context) {
      super(props, context)

      const theme = isThemingEnabled ? themeListener.initial(context) : noTheme

      this.state = this.createState({theme})
    }

    get jss() {
      return this.context.jss || jss
    }

    get manager() {
      return this.context.jssSheetsManager || manager
    }

    createState({theme, dynamicSheet}) {
      let staticSheet = this.manager.get(theme)
      let dynamicStyles

      if (!staticSheet) {
        const styles = getStyles(stylesOrCreator, theme)
        staticSheet = this.jss.createStyleSheet(styles, {
          ...options,
          ...this.context.jssSheetOptions
        })
        this.manager.add(theme, staticSheet)
        dynamicStyles = compose(staticSheet, getDynamicStyles(styles))
        staticSheet[dynamicStylesNs] = dynamicStyles
      }
      else dynamicStyles = staticSheet[dynamicStylesNs]

      if (dynamicStyles) {
        dynamicSheet = this.jss.createStyleSheet(dynamicStyles, {
          ...options,
          ...this.context.jssSheetOptions,
          meta: `${options.meta}Dynamic`,
          link: true
        })
      }

      return {theme, dynamicSheet}
    }

    manage({theme, dynamicSheet}) {
      const {jssSheetsRegistry: registry} = this.context

      const staticSheet = this.manager.manage(theme)
      if (registry) registry.add(staticSheet)

      if (dynamicSheet) {
        dynamicSheet
          .update(this.props)
          .attach()
        if (registry) registry.add(dynamicSheet)
      }
    }

    componentWillMount() {
      this.manage(this.state)
    }

    setTheme = theme => this.setState({theme})

    componentDidMount() {
      this.unsubscribe = themeListener.subscribe(this.context, this.setTheme)
    }

    componentWillReceiveProps(nextProps) {
      const {dynamicSheet} = this.state
      if (dynamicSheet) dynamicSheet.update(nextProps)
    }

    componentWillUpdate(nextProps, nextState) {
      if (isThemingEnabled && this.state.theme !== nextState.theme) {
        const newState = this.createState(nextState)
        this.manage(newState)
        this.setState(newState)
      }
    }

    componentDidUpdate(prevProps, prevState) {
      // We remove previous dynamicSheet only after new one was created to avoid FOUC.
      if (prevState.dynamicSheet !== this.state.dynamicSheet) {
        this.jss.removeStyleSheet(prevState.dynamicSheet)
      }
    }

    componentWillUnmount() {
      if (isThemingEnabled && this.unsubscribe) this.unsubscribe()

      this.manager.unmanage(this.state.theme)
      if (this.state.dynamicSheet) {
        this.state.dynamicSheet.detach()
      }
    }

    render() {
      const {theme, dynamicSheet} = this.state
      const sheet = dynamicSheet || this.manager.get(theme)

      return (
        <InnerComponent
          sheet={sheet}
          classes={sheet.classes}
          theme={theme}
          {...this.props}
        />
      )
    }
  }
}
