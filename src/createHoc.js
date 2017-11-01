import React, {Component} from 'react'
import defaultTheming from 'theming'
import jss, {getDynamicStyles, SheetsManager} from './jss'
import compose from './compose'
import getDisplayName from './getDisplayName'
import * as ns from './ns'
import contextTypes from './contextTypes'

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

// Returns an object with array property as a key and true as a value.
const toMap = arr => arr.reduce((map, prop) => {
  map[prop] = true
  return map
}, {})

const defaultInjectProps = {
  sheet: false,
  classes: true,
  theme: true
}

let managersCounter = 0

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
  const {theming = defaultTheming, inject, ...sheetOptions} = options
  const injectMap = inject ? toMap(inject) : defaultInjectProps
  const {themeListener} = theming
  const displayName = getDisplayName(InnerComponent)
  const defaultClassNamePrefix = `${displayName}-`
  const noTheme = {}
  const managerId = managersCounter++
  const manager = new SheetsManager()

  return class Jss extends Component {
    static displayName = `Jss(${displayName})`
    static InnerComponent = InnerComponent
    static contextTypes = {
      ...contextTypes,
      ...(isThemingEnabled && themeListener.contextTypes)
    }
    static defaultProps = InnerComponent.defaultProps

    constructor(props, context) {
      super(props, context)
      const theme = isThemingEnabled ? themeListener.initial(context) : noTheme

      this.state = this.createState({theme})
    }

    get jss() {
      return this.context[ns.jss] || jss
    }

    get manager() {
      const managers = this.context[ns.managers]

      // If `managers` map is present in the context, we use it in order to
      // let JssProvider reset them when new response has to render server-side.
      if (managers) {
        if (!managers[managerId]) {
          managers[managerId] = new SheetsManager()
        }
        return managers[managerId]
      }

      return manager
    }

    createState({theme, dynamicSheet}) {
      const contextSheetOptions = this.context[ns.sheetOptions]
      let classNamePrefix = defaultClassNamePrefix
      let staticSheet = this.manager.get(theme)
      let dynamicStyles

      if (contextSheetOptions && contextSheetOptions.classNamePrefix) {
        classNamePrefix = contextSheetOptions.classNamePrefix + classNamePrefix
      }

      if (!staticSheet) {
        const styles = getStyles(stylesOrCreator, theme)
        staticSheet = this.jss.createStyleSheet(styles, {
          ...sheetOptions,
          ...contextSheetOptions,
          meta: `${displayName}, ${isThemingEnabled ? 'Themed' : 'Unthemed'}, Static`,
          classNamePrefix
        })
        this.manager.add(theme, staticSheet)
        dynamicStyles = compose(staticSheet, getDynamicStyles(styles))
        staticSheet[dynamicStylesNs] = dynamicStyles
      }
      else dynamicStyles = staticSheet[dynamicStylesNs]

      if (dynamicStyles) {
        dynamicSheet = this.jss.createStyleSheet(dynamicStyles, {
          ...sheetOptions,
          ...contextSheetOptions,
          meta: `${displayName}, ${isThemingEnabled ? 'Themed' : 'Unthemed'}, Dynamic`,
          classNamePrefix,
          link: true
        })
      }

      return {theme, dynamicSheet}
    }

    manage({theme, dynamicSheet}) {
      const registry = this.context[ns.sheetsRegistry]

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
      if (isThemingEnabled) {
        this.unsubscribe = themeListener.subscribe(this.context, this.setTheme)
      }
    }

    componentWillReceiveProps(nextProps) {
      const {dynamicSheet} = this.state
      if (dynamicSheet) dynamicSheet.update(nextProps)
    }

    componentWillUpdate(nextProps, nextState) {
      if (isThemingEnabled && this.state.theme !== nextState.theme) {
        const newState = this.createState(nextState)
        this.manage(newState)
        this.manager.unmanage(this.state.theme)
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
      if (isThemingEnabled && typeof this.unsubscribe === 'function') {
        this.unsubscribe()
      }

      this.manager.unmanage(this.state.theme)
      if (this.state.dynamicSheet) {
        this.state.dynamicSheet.detach()
      }
    }

    render() {
      const {theme, dynamicSheet} = this.state
      const sheet = dynamicSheet || this.manager.get(theme)
      const jssProps = {}
      if (injectMap.sheet) jssProps.sheet = sheet
      if (injectMap.classes) jssProps.classes = sheet.classes
      if (isThemingEnabled && injectMap.theme) jssProps.theme = theme

      return <InnerComponent {...jssProps} {...this.props} />
    }
  }
}
