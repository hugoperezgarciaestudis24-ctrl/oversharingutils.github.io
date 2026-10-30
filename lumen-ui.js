(() => {
  // node_modules/.pnpm/@santi020k+lumen-core@4.1.0/node_modules/@santi020k/lumen-core/dist/foundations.generated.js
  var lumenCssColorTokens = {
    light: {
      canvas: "210 24% 98%",
      surface: "0 0% 100%",
      surfaceMuted: "210 22% 95%",
      surfaceStrong: "213 18% 88%",
      line: "214 17% 84%",
      ink: "216 28% 12%",
      inkSoft: "215 14% 35%",
      inkMuted: "215 10% 50%",
      brand: "201 96% 32%",
      brandSolid: "201 96% 28%",
      brandSoft: "198 64% 92%",
      onBrand: "0 0% 100%",
      accent: "169 78% 33%",
      success: "142 76% 36%",
      warning: "38 92% 50%",
      danger: "0 84% 60%",
      onDanger: "0 0% 0%"
    },
    dark: {
      canvas: "224 24% 8%",
      surface: "224 18% 11%",
      surfaceMuted: "223 16% 15%",
      surfaceStrong: "222 14% 22%",
      line: "222 14% 26%",
      ink: "210 20% 96%",
      inkSoft: "214 14% 77%",
      inkMuted: "216 10% 62%",
      brand: "199 91% 56%",
      brandSolid: "199 91% 36%",
      brandSoft: "199 84% 16%",
      onBrand: "0 0% 100%",
      accent: "166 76% 43%",
      success: "142 69% 45%",
      warning: "38 92% 55%",
      danger: "0 84% 65%",
      onDanger: "224 24% 8%"
    }
  };
  var lumenChartCssColorTokens = {
    light: {
      axis: "var(--ink-muted)",
      grid: "var(--line)",
      reference: "var(--ink-soft)",
      selection: "var(--brand)",
      tooltipBackground: "var(--ink)",
      tooltipForeground: "var(--surface)",
      sequentialLow: "198 64% 92%",
      sequentialMid: "201 80% 58%",
      sequentialHigh: "201 96% 24%",
      divergingNegative: "0 84% 60%",
      divergingMid: "213 18% 88%",
      divergingPositive: "201 96% 32%",
      series1: "201 96% 32%",
      series2: "169 78% 33%",
      series3: "280 72% 56%",
      series4: "25 95% 53%",
      series5: "340 82% 55%",
      series6: "190 82% 42%",
      series7: "52 92% 45%",
      series8: "215 16% 47%"
    },
    dark: {
      axis: "var(--ink-muted)",
      grid: "var(--line)",
      reference: "var(--ink-soft)",
      selection: "var(--brand)",
      tooltipBackground: "var(--ink)",
      tooltipForeground: "var(--canvas)",
      sequentialLow: "199 84% 16%",
      sequentialMid: "199 72% 42%",
      sequentialHigh: "199 91% 66%",
      divergingNegative: "0 84% 65%",
      divergingMid: "222 14% 22%",
      divergingPositive: "199 91% 56%",
      series1: "199 91% 56%",
      series2: "166 76% 43%",
      series3: "285 82% 72%",
      series4: "31 96% 62%",
      series5: "342 88% 68%",
      series6: "188 86% 54%",
      series7: "52 94% 58%",
      series8: "215 18% 68%"
    }
  };
  var lumenRadii = {
    sm: 6,
    md: 10,
    lg: 12,
    xl: 16,
    "2xl": 20,
    "3xl": 24,
    full: 9999
  };
  var lumenFontFamilies = {
    sans: ["Montserrat", "Avenir Next", "Segoe UI", "sans-serif"]
  };
  var lumenDurations = {
    fast: 120,
    standard: 160,
    slow: 300
  };
  var lumenEasings = {
    standard: [0.32, 0.72, 0, 1],
    emphasized: [0.22, 1, 0.36, 1]
  };

  // node_modules/.pnpm/@santi020k+lumen-core@4.1.0/node_modules/@santi020k/lumen-core/dist/tokens.js
  var lumenColors = lumenCssColorTokens.light;
  var lumenDarkColors = lumenCssColorTokens.dark;
  var lumenChart = lumenChartCssColorTokens.light;
  var lumenDarkChart = lumenChartCssColorTokens.dark;
  var lumenRadius = {
    base: `${lumenRadii.md / 16}rem`,
    lg: `${lumenRadii.lg / 16}rem`,
    sm: `${lumenRadii.sm / 16}rem`
  };
  var lumenFont = lumenFontFamilies.sans.map((family) => family === "sans-serif" ? family : `"${family}"`).join(", ");
  var lumenMotion = {
    duration: `${lumenDurations.standard}ms`,
    durationFast: `${lumenDurations.fast}ms`,
    durationSlow: `${lumenDurations.slow}ms`,
    ease: `cubic-bezier(${lumenEasings.standard.join(", ")})`,
    easeEmphasized: `cubic-bezier(${lumenEasings.emphasized.join(", ")})`
  };
  var composeClassName = (...classes) => classes.filter(Boolean).join(" ");

  // node_modules/.pnpm/@santi020k+lumen-elements@4.2.0/node_modules/@santi020k/lumen-elements/dist/element-base.js
  var appliedClassNames = /* @__PURE__ */ new WeakMap();
  var mergeClassNames = (...classNames) => composeClassName(...classNames).split(/\s+/).filter(Boolean);
  var LumenElement = class extends HTMLElement {
    static config;
    static get observedAttributes() {
      return this.config.observedAttributes ?? Object.keys(this.config.attributeClasses ?? {});
    }
    connectedCallback() {
      this.applyDefaults();
      this.applyClassNames();
    }
    disconnectedCallback() {
    }
    attributeChangedCallback(_name, _previousValue, _value) {
      this.applyClassNames();
    }
    get config() {
      return this.constructor.config;
    }
    applyDefaults() {
      for (const [name, value] of Object.entries(this.config.defaults ?? {})) {
        if (!this.hasAttribute(name)) {
          this.setAttribute(name, value);
        }
      }
      if (this.config.role && !this.hasAttribute("role")) {
        this.setAttribute("role", this.config.role);
      }
    }
    applyClassNames() {
      const previousClassNames = appliedClassNames.get(this) ?? [];
      for (const className of previousClassNames) {
        this.classList.remove(className);
      }
      const classNames = mergeClassNames(this.config.baseClassName);
      for (const [attributeName, classMap] of Object.entries(this.config.attributeClasses ?? {})) {
        const attributeValue = this.hasAttribute(attributeName) ? this.getAttribute(attributeName) || "true" : this.config.defaults?.[attributeName];
        const className = attributeValue ? classMap[attributeValue] : void 0;
        if (className) {
          classNames.push(...mergeClassNames(className));
        }
      }
      this.classList.add(...classNames);
      appliedClassNames.set(this, classNames);
    }
  };
  var createLumenElementClass = (config) => class extends LumenElement {
    static config = config;
  };
  var defineLumenElement = (config, element, registry) => {
    const targetRegistry = registry ?? (typeof customElements === "undefined" ? void 0 : customElements);
    if (targetRegistry && !targetRegistry.get(config.tagName)) {
      targetRegistry.define(config.tagName, element);
    }
  };

  // node_modules/.pnpm/@santi020k+lumen-elements@4.2.0/node_modules/@santi020k/lumen-elements/dist/components/button.js
  var lumenButtonElementConfig = {
    attributeClasses: {
      variant: {
        default: "ui-button--default",
        destructive: "ui-button--destructive",
        ghost: "ui-button--ghost",
        link: "ui-button--link",
        outline: "ui-button--outline",
        secondary: "ui-button--secondary"
      },
      size: {
        default: "ui-button--default-size",
        icon: "ui-button--icon",
        lg: "ui-button--lg",
        sm: "ui-button--sm"
      },
      disabled: { true: "ui-button--disabled" },
      loading: { true: "ui-button--loading" }
    },
    baseClassName: "ui-button",
    defaults: {
      "data-slot": "button",
      role: "button",
      size: "default",
      tabindex: "0",
      variant: "default"
    },
    observedAttributes: ["variant", "size", "disabled", "loading", "aria-busy", "aria-disabled"],
    role: "button",
    tagName: "lumen-button"
  };
  var LumenButtonElement = class extends LumenElement {
    static config = lumenButtonElementConfig;
    spacePressed = false;
    applyingSemantics = false;
    hasBlockingAttribute() {
      return ["disabled", "loading"].some((name) => this.hasAttribute(name) && this.getAttribute(name) !== "false");
    }
    isLoading() {
      return this.hasAttribute("loading") && this.getAttribute("loading") !== "false";
    }
    syncManagedSemantic(name, active) {
      const ownership = `data-ui-button-${name}`;
      const recorded = this.getAttribute(ownership);
      this.applyingSemantics = true;
      try {
        if (active) {
          if (recorded === null) {
            const original = this.getAttribute(name);
            this.setAttribute(ownership, original === null ? "absent" : `value:${original}`);
          }
          this.setAttribute(name, "true");
        } else if (recorded !== null) {
          this.removeAttribute(ownership);
          if (this.getAttribute(name) !== "true")
            return;
          if (recorded === "absent")
            this.removeAttribute(name);
          else if (recorded.startsWith("value:"))
            this.setAttribute(name, recorded.slice(6));
        }
      } finally {
        this.applyingSemantics = false;
      }
    }
    syncBusySemantics() {
      this.syncManagedSemantic("aria-busy", this.isLoading());
    }
    syncDisabledSemantics() {
      this.syncManagedSemantic("aria-disabled", this.hasBlockingAttribute());
    }
    isBlocked() {
      return this.hasBlockingAttribute() || this.getAttribute("aria-disabled") === "true";
    }
    activateAfterDispatch(event) {
      setTimeout(() => {
        if (this.isConnected && !event.defaultPrevented && !this.isBlocked())
          this.click();
      }, 0);
    }
    onKeyDown = (event) => {
      if (event.target !== this || event.defaultPrevented || event.repeat || event.isComposing || this.isBlocked())
        return;
      if (event.key === "Enter")
        this.activateAfterDispatch(event);
      if (event.key === " ") {
        event.preventDefault();
        this.spacePressed = true;
      }
    };
    onKeyUp = (event) => {
      if (event.key !== " ")
        return;
      const spacePressed = this.spacePressed;
      this.spacePressed = false;
      if (event.target === this && spacePressed && !event.isComposing)
        this.activateAfterDispatch(event);
    };
    onBlur = () => {
      this.spacePressed = false;
    };
    onClick = (event) => {
      if (!this.isBlocked())
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    connectedCallback() {
      super.connectedCallback();
      this.syncDisabledSemantics();
      this.syncBusySemantics();
      this.addEventListener("keydown", this.onKeyDown);
      this.addEventListener("keyup", this.onKeyUp);
      this.addEventListener("blur", this.onBlur);
      this.addEventListener("click", this.onClick, true);
    }
    attributeChangedCallback(name, previousValue, value) {
      super.attributeChangedCallback(name, previousValue, value);
      if (this.applyingSemantics)
        return;
      if ((name === "aria-busy" || name === "aria-disabled") && previousValue !== null && previousValue !== void 0) {
        this.removeAttribute(`data-ui-button-${name}`);
      }
      if (!this.isConnected)
        return;
      this.syncDisabledSemantics();
      this.syncBusySemantics();
    }
    disconnectedCallback() {
      this.spacePressed = false;
      this.removeEventListener("keydown", this.onKeyDown);
      this.removeEventListener("keyup", this.onKeyUp);
      this.removeEventListener("blur", this.onBlur);
      this.removeEventListener("click", this.onClick, true);
      super.disconnectedCallback();
    }
  };
  var defineLumenButton = (registry) => {
    defineLumenElement(lumenButtonElementConfig, LumenButtonElement, registry);
  };

  // node_modules/.pnpm/@santi020k+lumen-elements@4.2.0/node_modules/@santi020k/lumen-elements/dist/components/card.js
  var lumenCardElementConfig = {
    attributeClasses: {
      density: {
        comfortable: "ui-card--comfortable",
        compact: "ui-card--compact",
        spacious: "ui-card--spacious"
      },
      glass: {
        strong: "ui-card--glass ui-glass-strong",
        subtle: "ui-card--glass ui-glass-subtle",
        true: "ui-card--glass"
      },
      variant: {
        glass: "ui-card--glass",
        interactive: "ui-card--interactive",
        muted: "ui-card--muted",
        unstyled: "ui-card--unstyled"
      }
    },
    baseClassName: "ui-card",
    defaults: { "data-slot": "card", density: "comfortable", variant: "default" },
    tagName: "lumen-card"
  };
  var LumenCardElement = createLumenElementClass(lumenCardElementConfig);
  var defineLumenCard = (registry) => {
    defineLumenElement(lumenCardElementConfig, LumenCardElement, registry);
  };

  // outputs/lumen-entry.js
  defineLumenButton();
  defineLumenCard();
})();
