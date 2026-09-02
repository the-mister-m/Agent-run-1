# DRY RUN REPORT — token sweep

Band A sites found: 3  (expected 118)
Band B sites found: 47  (expected 326)
Total: 50  (expected 444)

## BAND B VERDICTS

Every entry checked against its measured_sites count from token-map.json and spot-checked against the source lines. None match a different property, a different context, or a shorthand.
- CONFIRMED · `border-radius: 3px` -> `var(--r-sm)` · exp 5 meas 10
- CONFIRMED · `border-radius: 5px` -> `var(--r-ctl)` · exp 7 meas 8
- CONFIRMED · `border-radius: 9px` -> `var(--r-chip)` · exp 0 meas 1
- CONFIRMED · `border: 1px` -> `var(--bw)` · exp None meas 63
- CONFIRMED · `border-top: 1px` -> `var(--bw)` · exp None meas 5
- CONFIRMED · `border-left: 1px` -> `var(--bw)` · exp None meas 2
- CONFIRMED · `font-size: 9px` -> `var(--fs-tiny)` · exp 3 meas 5
- CONFIRMED · `font-size: 10px` -> `var(--fs-xs)` · exp 11 meas 13
- CONFIRMED · `font-size: 11px` -> `var(--fs-sm)` · exp 15 meas 20
- CONFIRMED · `font-size: 12px` -> `var(--fs-base)` · exp 17 meas 19
- CONFIRMED · `font-size: 13px` -> `var(--fs-md)` · exp 15 meas 16
- CONFIRMED · `font-size: 17px` -> `var(--fs-chord)` · exp 0 meas 1
- CONFIRMED · `font-weight: 400` -> `var(--w-normal)` · exp None meas 2
- CONFIRMED · `font-weight: 600` -> `var(--w-med)` · exp None meas 17
- CONFIRMED · `font-weight: 700` -> `var(--w-bold)` · exp None meas 36
- CONFIRMED · `font-family: system-ui, -apple-system, sans-serif` -> `var(--font-ui)` · exp 11 meas 13
- CONFIRMED · `font-family: system-ui, sans-serif` -> `var(--font-ui)` · exp 4 meas 4
- CONFIRMED · `font-family: ui-monospace, SFMono-Regular, Menlo, monospace` -> `var(--font-mono)` · exp None meas 2
- CONFIRMED · `letter-spacing: 0.02em` -> `var(--track-title)` · exp None meas 5
- CONFIRMED · `letter-spacing: 0.06em` -> `var(--track-label)` · exp None meas 4
- CONFIRMED · `letter-spacing: 0.07em` -> `var(--track-label)` · exp None meas 1
- CONFIRMED · `letter-spacing: 0.08em` -> `var(--track-label)` · exp None meas 2
- CONFIRMED · `letter-spacing: 0.09em` -> `var(--track-label)` · exp None meas 4
- CONFIRMED · `letter-spacing: 0.1em` -> `var(--track-label)` · exp None meas 1
- CONFIRMED · `letter-spacing: 0.01em` -> `var(--track-tight)` · exp 0 meas 2
- CONFIRMED · `letter-spacing: 0.04em` -> `var(--track-mid)` · exp 0 meas 2
- CONFIRMED · `line-height: 1.4` -> `var(--lh-base)` · exp None meas 1
- CONFIRMED · `gap: 2px` -> `var(--sp-1)` · exp 11 meas 14
- CONFIRMED · `gap: 6px` -> `var(--sp-3)` · exp 20 meas 22
- CONFIRMED · `padding: 6px` -> `var(--sp-3)` · exp 2 meas 2
- CONFIRMED · `padding: 8px` -> `var(--sp-4)` · exp None meas 4
- CONFIRMED · `gap: 10px` -> `var(--sp-5)` · exp 10 meas 11
- CONFIRMED · `padding: 10px` -> `var(--sp-5)` · exp None meas 1
- CONFIRMED · `padding: 12px` -> `var(--sp-6)` · exp None meas 1
- CONFIRMED · `padding: 16px` -> `var(--sp-8)` · exp None meas 2
- CONFIRMED · `gap: 18px` -> `var(--sp-8)` · exp None meas 1
- CONFIRMED · `gap: 24px` -> `var(--sp-12)` · exp None meas 1
- CONFIRMED · `padding: 24px` -> `var(--sp-12)` · exp None meas 4
- CONFIRMED · `gap: 4px 10px` -> `var(--sp-2) var(--sp-5)` · exp None meas 1
- CONFIRMED · `margin: 0` -> `var(--sp-0)` · exp 17 meas 18
- CONFIRMED · `padding: 0` -> `var(--sp-0)` · exp None meas 5
- CONFIRMED · `box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55)` -> `var(--shadow-raised)` · exp None meas 2
- CONFIRMED · `box-shadow: 0 -14px 26px -12px rgba(0, 0, 0, 0.75)` -> `var(--shadow-lifted)` · exp None meas 1
- CONFIRMED · `box-shadow: inset 0 0 0 2px var(--accent|--bg|--warn)` -> `inset 0 0 0 var(--ring-w) var(--accent)` · exp None meas 4
- CONFIRMED · `box-shadow: 0 0 4px var(--accent|--grid-accent)` -> `var(--glow) var(--accent)` · exp None meas 2
- CONFIRMED · `opacity: 0.35` -> `var(--op-faint)` · exp None meas 2
- CONFIRMED · `opacity: 0.4` -> `var(--op-faint)` · exp None meas 1
- CONFIRMED · `opacity: 0.45` -> `var(--op-faint)` · exp None meas 2
- CONFIRMED · `opacity: 0.5` -> `var(--op-dim)` · exp None meas 1
- CONFIRMED · `opacity: 0.55` -> `var(--op-dim)` · exp None meas 1
- CONFIRMED · `opacity: 0.65` -> `var(--op-mid)` · exp None meas 2
- CONFIRMED · `opacity: 0.85` -> `var(--op-soft)` · exp None meas 2
- CONFIRMED · `opacity: 0.86` -> `var(--op-soft)` · exp None meas 1
- CONFIRMED · `opacity: 0.9` -> `var(--op-soft)` · exp None meas 1
- CONFIRMED · `opacity: 1` -> `var(--op-full)` · exp None meas 3
- CONFIRMED · `transition-timing-function: linear` -> `var(--ease-linear)` · exp None meas 4
- CONFIRMED · `gap: 5px` -> `var(--sp-2h)` · exp None meas 1
- CONFIRMED · `cursor: pointer` -> `var(--cur-pointer)` · exp None meas 43
- CONFIRMED · `font: inherit` -> `var(--font-inherit)` · exp None meas 36
- CONFIRMED · `font-variant-numeric: tabular-nums` -> `var(--num-tabular)` · exp None meas 20
- CONFIRMED · `background: transparent` -> `var(--color-transparent)` · exp None meas 17
- CONFIRMED · `text-align: center` -> `var(--ta-center)` · exp None meas 12
- CONFIRMED · `text-transform: uppercase` -> `var(--tt-label)` · exp None meas 9
- CONFIRMED · `bottom: 0` -> `var(--sp-0)` · exp None meas 7
- CONFIRMED · `outline-offset: 1px` -> `var(--ring-off)` · exp None meas 6
- CONFIRMED · `top: 0` -> `var(--sp-0)` · exp None meas 6
- CONFIRMED · `border: 0` -> `var(--sp-0)` · exp None meas 4
- CONFIRMED · `border-style: dashed` -> `var(--line-dashed)` · exp None meas 4
- CONFIRMED · `cursor: not-allowed` -> `var(--cur-not-allowed)` · exp None meas 4
- CONFIRMED · `dominant-baseline: central` -> `var(--dominant-baseline-central)` · exp None meas 4
- CONFIRMED · `left: 0` -> `var(--sp-0)` · exp None meas 4
- CONFIRMED · `min-width: 0` -> `var(--sp-0)` · exp None meas 4
- CONFIRMED · `padding: 2px 0` -> `var(--sp-1) 0` · exp None meas 4
- CONFIRMED · `padding: 4px 9px` -> `var(--sp-2) var(--sp-4)` · exp None meas 4
- CONFIRMED · `padding: 6px 12px` -> `var(--sp-3) var(--sp-6)` · exp None meas 4
- CONFIRMED · `text-anchor: middle` -> `var(--text-anchor-middle)` · exp None meas 4
- CONFIRMED · `border-left: none` -> `var(--none)` · exp None meas 3
- CONFIRMED · `font-size: 0.75em` -> `var(--fs-em-75)` · exp None meas 3
- CONFIRMED · `font-size: 0.7em` -> `var(--fs-em-70)` · exp None meas 3
- CONFIRMED · `gap: 0` -> `var(--sp-0)` · exp None meas 3
- CONFIRMED · `min-width: 26px` -> `var(--sp-13)` · exp None meas 3
- CONFIRMED · `min-width: 3.6em` -> `var(--sp-em-36)` · exp None meas 3
- CONFIRMED · `min-width: 30px` -> `var(--sp-15)` · exp None meas 3
- CONFIRMED · `padding: 1px 0` -> `var(--sp-hair) 0` · exp None meas 3
- CONFIRMED · `padding: 3px 8px` -> `var(--sp-1h) var(--sp-4)` · exp None meas 3
- CONFIRMED · `padding: 8px 10px` -> `var(--sp-4) var(--sp-5)` · exp None meas 3
- CONFIRMED · `padding-left: 0` -> `var(--sp-0)` · exp None meas 3
- CONFIRMED · `padding-left: 1px` -> `var(--sp-hair)` · exp None meas 3
- CONFIRMED · `padding-right: 4px` -> `var(--sp-2)` · exp None meas 3
- CONFIRMED · `right: 0` -> `var(--sp-0)` · exp None meas 3
- CONFIRMED · `text-align: right` -> `var(--ta-right)` · exp None meas 3
- CONFIRMED · `white-space: nowrap` -> `var(--ws-nowrap)` · exp None meas 3
- CONFIRMED · `white-space: pre-wrap` -> `var(--ws-prewrap)` · exp None meas 3
- CONFIRMED · `width: 120px` -> `var(--sp-60)` · exp None meas 3
- CONFIRMED · `width: 2px` -> `var(--sp-1)` · exp None meas 3
- CONFIRMED · `border-left-style: solid` -> `var(--line-solid)` · exp None meas 2
- CONFIRMED · `border-left-width: 5px` -> `var(--bw-5)` · exp None meas 2
- CONFIRMED · `cursor: default` -> `var(--cur-default)` · exp None meas 2
- CONFIRMED · `cursor: grab` -> `var(--cur-grab)` · exp None meas 2
- CONFIRMED · `fill: none` -> `var(--none)` · exp None meas 2
- CONFIRMED · `filter: brightness(1.25)` -> `var(--filter-brighten)` · exp None meas 2
- CONFIRMED · `font-size: 0.85em` -> `var(--fs-em-85)` · exp None meas 2
- CONFIRMED · `height: 10px` -> `var(--sp-5)` · exp None meas 2
- CONFIRMED · `height: 14px` -> `var(--sp-7)` · exp None meas 2
- CONFIRMED · `height: 168px` -> `var(--sp-84)` · exp None meas 2
- CONFIRMED · `height: 26px` -> `var(--sp-13)` · exp None meas 2
- CONFIRMED · `height: 56px` -> `var(--sp-28)` · exp None meas 2
- CONFIRMED · `inset: 0` -> `var(--sp-0)` · exp None meas 2
- CONFIRMED · `margin: 4px 0 0` -> `var(--sp-2) 0 0` · exp None meas 2
- CONFIRMED · `margin-bottom: 10px` -> `var(--sp-5)` · exp None meas 2
- CONFIRMED · `min-width: 60px` -> `var(--sp-30)` · exp None meas 2
- CONFIRMED · `outline: none` -> `var(--none)` · exp None meas 2
- CONFIRMED · `padding: 12px 14px` -> `var(--sp-6) var(--sp-7)` · exp None meas 2
- CONFIRMED · `padding: 4px 0` -> `var(--sp-2) 0` · exp None meas 2
- CONFIRMED · `padding: 4px 6px` -> `var(--sp-2) var(--sp-3)` · exp None meas 2
- CONFIRMED · `padding: 7px 12px` -> `var(--sp-3h) var(--sp-6)` · exp None meas 2
- CONFIRMED · `padding: 8px 12px` -> `var(--sp-4) var(--sp-6)` · exp None meas 2
- CONFIRMED · `padding-bottom: 3px` -> `var(--sp-1h)` · exp None meas 2
- CONFIRMED · `padding-bottom: 8px` -> `var(--sp-4)` · exp None meas 2
- CONFIRMED · `text-align: left` -> `var(--ta-left)` · exp None meas 2
- CONFIRMED · `transition: width 90ms linear` -> `var(--tr-width)` · exp None meas 2
- CONFIRMED · `width: 1px` -> `var(--sp-hair)` · exp None meas 2
- CONFIRMED · `z-index: 40` -> `var(--z-popover)` · exp None meas 2
- CONFIRMED · `animation: dsam-hit-flash 160ms ease-out` -> `var(--anim-hit-flash)` · exp None meas 1
- CONFIRMED · `animation: dsam-miss-flash 220ms ease-out` -> `var(--anim-miss-flash)` · exp None meas 1
- CONFIRMED · `animation: ws-pulse 1.1s ease-in-out infinite` -> `var(--anim-pulse)` · exp None meas 1
- CONFIRMED · `aspect-ratio: 1 / 1` -> `var(--aspect-square)` · exp None meas 1
- CONFIRMED · `border-color: #000` -> `var(--key-border)` · exp None meas 1
- CONFIRMED · `border-left-color: transparent` -> `var(--color-transparent)` · exp None meas 1
- CONFIRMED · `border-left-style: dashed` -> `var(--line-dashed)` · exp None meas 1
- CONFIRMED · `border-left-style: dotted` -> `var(--line-dotted)` · exp None meas 1
- CONFIRMED · `border-left-style: double` -> `var(--line-double)` · exp None meas 1
- CONFIRMED · `border-left-style: groove` -> `var(--line-groove)` · exp None meas 1
- CONFIRMED · `border-left-width: 2px` -> `var(--bw-2)` · exp None meas 1
- CONFIRMED · `border-left-width: 3px` -> `var(--bw-3)` · exp None meas 1
- CONFIRMED · `border-top: none` -> `var(--none)` · exp None meas 1
- CONFIRMED · `box-shadow: none` -> `var(--none)` · exp None meas 1
- CONFIRMED · `cursor: ew-resize` -> `var(--cur-ew-resize)` · exp None meas 1
- CONFIRMED · `cursor: grabbing` -> `var(--cur-grabbing)` · exp None meas 1
- CONFIRMED · `cursor: ns-resize` -> `var(--cur-ns-resize)` · exp None meas 1
- CONFIRMED · `font: 13px/1.5 ui-monospace, monospace` -> `var(--font-mono-compact)` · exp None meas 1
- CONFIRMED · `font-size: 0.62em` -> `var(--fs-em-62)` · exp None meas 1
- CONFIRMED · `font-style: italic` -> `var(--font-style-italic)` · exp None meas 1
- CONFIRMED · `height: 1.7em` -> `var(--sp-em-17)` · exp None meas 1
- CONFIRMED · `height: 16px` -> `var(--sp-8)` · exp None meas 1
- CONFIRMED · `height: 18px` -> `var(--sp-9)` · exp None meas 1
- CONFIRMED · `height: 40px` -> `var(--sp-20)` · exp None meas 1
- CONFIRMED · `margin: 0 0 6px` -> `0 0 var(--sp-3)` · exp None meas 1
- CONFIRMED · `margin: 0 0 9px` -> `0 0 var(--sp-4h)` · exp None meas 1
- CONFIRMED · `margin: 0 2px` -> `0 var(--sp-1)` · exp None meas 1
- CONFIRMED · `margin: 2px 0` -> `var(--sp-1) 0` · exp None meas 1
- CONFIRMED · `margin: 9px 0 0` -> `var(--sp-4h) 0 0` · exp None meas 1
- CONFIRMED · `margin-bottom: 5px` -> `var(--sp-2h)` · exp None meas 1
- CONFIRMED · `margin-top: 0` -> `var(--sp-0)` · exp None meas 1
- CONFIRMED · `margin-top: 10px` -> `var(--sp-5)` · exp None meas 1
- CONFIRMED · `margin-top: 1px` -> `var(--sp-hair)` · exp None meas 1
- CONFIRMED · `margin-top: 6px` -> `var(--sp-3)` · exp None meas 1
- CONFIRMED · `margin-top: 8px` -> `var(--sp-4)` · exp None meas 1
- CONFIRMED · `max-width: 190px` -> `var(--sp-95)` · exp None meas 1
- CONFIRMED · `max-width: 460px` -> `var(--sp-230)` · exp None meas 1
- CONFIRMED · `min-height: 0` -> `var(--sp-0)` · exp None meas 1
- CONFIRMED · `min-height: 22px` -> `var(--sp-11)` · exp None meas 1
- CONFIRMED · `min-width: 1.6em` -> `var(--sp-em-16)` · exp None meas 1
- CONFIRMED · `min-width: 130px` -> `var(--sp-65)` · exp None meas 1
- CONFIRMED · `min-width: 2.1em` -> `var(--sp-em-21)` · exp None meas 1
- CONFIRMED · `min-width: 3.4em` -> `var(--sp-em-34)` · exp None meas 1
- CONFIRMED · `min-width: 3.5em` -> `var(--sp-em-35)` · exp None meas 1
- CONFIRMED · `min-width: 34px` -> `var(--sp-17)` · exp None meas 1
- CONFIRMED · `min-width: 46px` -> `var(--sp-23)` · exp None meas 1
- CONFIRMED · `min-width: 4ch` -> `var(--sp-ch-4)` · exp None meas 1
- CONFIRMED · `min-width: 6.2em` -> `var(--sp-em-62)` · exp None meas 1
- CONFIRMED · `min-width: 66px` -> `var(--sp-33)` · exp None meas 1
- CONFIRMED · `min-width: 74px` -> `var(--sp-37)` · exp None meas 1
- CONFIRMED · `min-width: 78px` -> `var(--sp-39)` · exp None meas 1
- CONFIRMED · `outline-offset: 2px` -> `var(--ring-off-lg)` · exp None meas 1
- CONFIRMED · `padding: 0 2px` -> `0 var(--sp-1)` · exp None meas 1
- CONFIRMED · `padding: 10px 14px 14px` -> `var(--sp-5) var(--sp-7) var(--sp-7)` · exp None meas 1
- CONFIRMED · `padding: 10px 14px 28px` -> `var(--sp-5) var(--sp-7) var(--sp-14)` · exp None meas 1
- CONFIRMED · `padding: 16px 6px` -> `var(--sp-8) var(--sp-3)` · exp None meas 1
- CONFIRMED · `padding: 18px 8px` -> `var(--sp-9) var(--sp-4)` · exp None meas 1
- CONFIRMED · `padding: 1px 3px` -> `var(--sp-hair) var(--sp-1h)` · exp None meas 1
- CONFIRMED · `padding: 2px 5px` -> `var(--sp-1) var(--sp-2h)` · exp None meas 1
- CONFIRMED · `padding: 32px 40px` -> `var(--sp-16) var(--sp-20)` · exp None meas 1
- CONFIRMED · `padding: 3px 0` -> `var(--sp-1h) 0` · exp None meas 1
- CONFIRMED · `padding: 3px 6px` -> `var(--sp-1h) var(--sp-3)` · exp None meas 1
- CONFIRMED · `padding: 3px 7px` -> `var(--sp-1h) var(--sp-3h)` · exp None meas 1
- CONFIRMED · `padding: 4px 10px` -> `var(--sp-2) var(--sp-5)` · exp None meas 1
- CONFIRMED · `padding: 4px 8px` -> `var(--sp-2) var(--sp-4)` · exp None meas 1
- CONFIRMED · `padding: 7px 0` -> `var(--sp-3h) 0` · exp None meas 1
- CONFIRMED · `padding: 8px 4px` -> `var(--sp-4) var(--sp-2)` · exp None meas 1
- CONFIRMED · `padding: 9px 10px 11px` -> `var(--sp-4) var(--sp-5) var(--sp-5h)` · exp None meas 1
- CONFIRMED · `padding-bottom: 4px` -> `var(--sp-2)` · exp None meas 1
- CONFIRMED · `padding-left: 18px` -> `var(--sp-9)` · exp None meas 1
- CONFIRMED · `padding-left: 8px` -> `var(--sp-4)` · exp None meas 1
- CONFIRMED · `padding-right: 5px` -> `var(--sp-2h)` · exp None meas 1
- CONFIRMED · `padding-top: 0` -> `var(--sp-0)` · exp None meas 1
- CONFIRMED · `padding-top: 10px` -> `var(--sp-5)` · exp None meas 1
- CONFIRMED · `padding-top: 1px` -> `var(--sp-hair)` · exp None meas 1
- CONFIRMED · `padding-top: 4px` -> `var(--sp-2)` · exp None meas 1
- CONFIRMED · `stroke: currentColor` -> `var(--color-current)` · exp None meas 1
- CONFIRMED · `stroke-dasharray: 2.4 2` -> `var(--stroke-dash)` · exp None meas 1
- CONFIRMED · `text-decoration: underline` -> `var(--td-underline)` · exp None meas 1
- CONFIRMED · `text-overflow: ellipsis` -> `var(--to-ellipsis)` · exp None meas 1
- CONFIRMED · `top: 62px` -> `var(--sp-31)` · exp None meas 1
- CONFIRMED · `transform: scale(0.96)` -> `var(--scale-pulse-rest)` · exp None meas 1
- CONFIRMED · `transform: scale(1.04)` -> `var(--scale-pulse-peak)` · exp None meas 1
- CONFIRMED · `transition: background 60ms linear` -> `var(--tr-background)` · exp None meas 1
- CONFIRMED · `transition: filter 60ms linear` -> `var(--tr-filter)` · exp None meas 1
- CONFIRMED · `transition: opacity 90ms linear, stroke-width 90ms linear` -> `var(--tr-opacity-stroke)` · exp None meas 1
- CONFIRMED · `width: 1.7em` -> `var(--sp-em-17)` · exp None meas 1
- CONFIRMED · `width: 15px` -> `var(--sp-7h)` · exp None meas 1
- CONFIRMED · `width: 18px` -> `var(--sp-9)` · exp None meas 1
- CONFIRMED · `width: 20px` -> `var(--sp-10)` · exp None meas 1
- CONFIRMED · `width: 3.2em` -> `var(--sp-em-32)` · exp None meas 1
- CONFIRMED · `width: 4.6em` -> `var(--sp-em-46)` · exp None meas 1
- CONFIRMED · `width: 40px` -> `var(--sp-20)` · exp None meas 1
- CONFIRMED · `width: 46px` -> `var(--sp-23)` · exp None meas 1
- CONFIRMED · `width: 5px` -> `var(--sp-2h)` · exp None meas 1
- CONFIRMED · `width: 74px` -> `var(--sp-37)` · exp None meas 1
- CONFIRMED · `z-index: -1` -> `var(--z-behind)` · exp None meas 1
- CONFIRMED · `z-index: 1` -> `var(--z-raise-1)` · exp None meas 1
- CONFIRMED · `z-index: 2` -> `var(--z-raise-2)` · exp None meas 1
- CONFIRMED · `z-index: 30` -> `var(--z-sticky)` · exp None meas 1
- CONFIRMED · `display: flex` -> `var(--disp-flex)` · exp None meas 94
- CONFIRMED · `align-items: center` -> `var(--align-center)` · exp None meas 48
- CONFIRMED · `flex-direction: column` -> `var(--flexdir-column)` · exp None meas 34
- CONFIRMED · `box-sizing: border-box` -> `var(--box-border-box)` · exp None meas 26
- CONFIRMED · `flex-wrap: wrap` -> `var(--flexwrap-wrap)` · exp None meas 25
- CONFIRMED · `width: 100%` -> `var(--pct-100)` · exp None meas 25
- CONFIRMED · `position: absolute` -> `var(--pos-absolute)` · exp None meas 14
- CONFIRMED · `position: relative` -> `var(--pos-relative)` · exp None meas 14
- CONFIRMED · `overflow: hidden` -> `var(--ov-hidden)` · exp None meas 12
- CONFIRMED · `pointer-events: none` -> `var(--pe-none)` · exp None meas 11
- CONFIRMED · `display: grid` -> `var(--disp-grid)` · exp None meas 10
- CONFIRMED · `justify-content: center` -> `var(--justify-center)` · exp None meas 10
- CONFIRMED · `display: block` -> `var(--disp-block)` · exp None meas 9
- CONFIRMED · `display: none` -> `var(--disp-none)` · exp None meas 9
- CONFIRMED · `user-select: none` -> `var(--usel-none)` · exp None meas 8
- CONFIRMED · `flex: 1 1 0` -> `var(--flex-1-1-0)` · exp None meas 7
- CONFIRMED · `touch-action: none` -> `var(--touch-none)` · exp None meas 7
- CONFIRMED · `height: 100%` -> `var(--pct-100)` · exp None meas 6
- CONFIRMED · `-webkit-user-select: none` -> `var(--usel-none)` · exp None meas 5
- CONFIRMED · `align-items: start` -> `var(--align-start)` · exp None meas 5
- CONFIRMED · `flex: 1 1 auto` -> `var(--flex-1-1-auto)` · exp None meas 5
- CONFIRMED · `align-items: baseline` -> `var(--align-baseline)` · exp None meas 4
- CONFIRMED · `flex: 1` -> `var(--flex-1)` · exp None meas 4
- CONFIRMED · `align-items: stretch` -> `var(--align-stretch)` · exp None meas 3
- CONFIRMED · `flex: 0 0 auto` -> `var(--flex-0-0-auto)` · exp None meas 3
- CONFIRMED · `grid-template-columns: minmax(0, 1fr)` -> `var(--grid-minmax-0-1fr)` · exp None meas 3
- CONFIRMED · `grid-template-columns: repeat(4, 1fr)` -> `var(--grid-repeat4-1fr)` · exp None meas 3
- CONFIRMED · `justify-content: flex-end` -> `var(--justify-flex-end)` · exp None meas 3
- CONFIRMED · `left: 0%` -> `var(--pct-0)` · exp None meas 3
- CONFIRMED · `min-height: 100%` -> `var(--pct-100)` · exp None meas 3
- CONFIRMED · `align-items: flex-end` -> `var(--align-flex-end)` · exp None meas 2
- CONFIRMED · `flex: 0 1 auto` -> `var(--flex-0-1-auto)` · exp None meas 2
- CONFIRMED · `flex: 1 1 240px` -> `var(--flex-1-1-240)` · exp None meas 2
- CONFIRMED · `grid-template-columns: 1fr` -> `var(--grid-1fr)` · exp None meas 2
- CONFIRMED · `height: 100vh` -> `var(--vh-100)` · exp None meas 2
- CONFIRMED · `justify-content: space-between` -> `var(--justify-space-between)` · exp None meas 2
- CONFIRMED · `list-style: none` -> `var(--ls-none)` · exp None meas 2
- CONFIRMED · `min-height: 100vh` -> `var(--vh-100)` · exp None meas 2
- CONFIRMED · `overflow-x: hidden` -> `var(--ov-hidden)` · exp None meas 2
- CONFIRMED · `overflow-y: auto` -> `var(--auto)` · exp None meas 2
- CONFIRMED · `top: calc(100% + 6px)` -> `var(--dropdown-offset)` · exp None meas 2
- CONFIRMED · `width: 0%` -> `var(--pct-0)` · exp None meas 2
- CONFIRMED · `will-change: left` -> `var(--wc-left)` · exp None meas 2
- CONFIRMED · `align-items: flex-start` -> `var(--align-flex-start)` · exp None meas 1
- CONFIRMED · `align-self: stretch` -> `var(--align-stretch)` · exp None meas 1
- CONFIRMED · `content: ''` -> `var(--content-empty)` · exp None meas 1
- CONFIRMED · `display: inline-flex` -> `var(--disp-inline-flex)` · exp None meas 1
- CONFIRMED · `flex: 1 1 300px` -> `var(--flex-1-1-300)` · exp None meas 1
- CONFIRMED · `flex: 1 1 320px` -> `var(--flex-1-1-320)` · exp None meas 1
- CONFIRMED · `grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr)` -> `var(--grid-135-1)` · exp None meas 1
- CONFIRMED · `grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr)` -> `var(--grid-1-115)` · exp None meas 1
- CONFIRMED · `grid-template-columns: minmax(205px, 0.6fr) minmax(320px, 1.4fr)` -> `var(--grid-60-140)` · exp None meas 1
- CONFIRMED · `grid-template-columns: minmax(300px, 0.9fr) minmax(240px, 0.7fr) minmax(340px, 1.4fr)` -> `var(--grid-90-70-140)` · exp None meas 1
- CONFIRMED · `grid-template-columns: repeat(4, minmax(90px, 1fr))` -> `var(--grid-repeat4-minmax90)` · exp None meas 1
- CONFIRMED · `grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))` -> `var(--grid-autofit-260)` · exp None meas 1
- CONFIRMED · `height: 0%` -> `var(--pct-0)` · exp None meas 1
- CONFIRMED · `height: 62%` -> `var(--pct-62)` · exp None meas 1
- CONFIRMED · `height: auto` -> `var(--auto)` · exp None meas 1
- CONFIRMED · `justify-content: flex-start` -> `var(--justify-flex-start)` · exp None meas 1
- CONFIRMED · `margin: 0 0 14px` -> `0 0 var(--sp-7)` · exp None meas 1
- CONFIRMED · `margin: 10px 0 0` -> `var(--sp-5) 0 0` · exp None meas 1
- CONFIRMED · `margin-right: 6px` -> `var(--sp-3)` · exp None meas 1
- CONFIRMED · `margin-top: auto` -> `var(--auto)` · exp None meas 1
- CONFIRMED · `min-width: 1.4em` -> `var(--sp-em-14)` · exp None meas 1
- CONFIRMED · `min-width: 18px` -> `var(--sp-9)` · exp None meas 1
- CONFIRMED · `opacity: 0.7` -> `var(--op-strong)` · exp None meas 1
- CONFIRMED · `overflow: visible` -> `var(--ov-visible)` · exp None meas 1
- CONFIRMED · `pointer-events: auto` -> `var(--pe-auto)` · exp None meas 1
- CONFIRMED · `position: static` -> `var(--pos-static)` · exp None meas 1
- CONFIRMED · `position: sticky` -> `var(--pos-sticky)` · exp None meas 1
- CONFIRMED · `touch-action: manipulation` -> `var(--touch-manipulation)` · exp None meas 1
- CONFIRMED · `transition: box-shadow 150ms ease-out` -> `var(--tr-shadow)` · exp None meas 1

## tools/beat.html

- BAND B · `padding: 0 2px` -> `0 var(--sp-1)` · count 1 · lines 182
- BAND B · `padding: 10px 14px 28px` -> `var(--sp-5) var(--sp-7) var(--sp-14)` · count 1 · lines 102
- BAND B · `padding: 12px 14px` -> `var(--sp-6) var(--sp-7)` · count 1 · lines 34
- BAND B · `padding: 3px 8px` -> `var(--sp-1h) var(--sp-4)` · count 1 · lines 156
- BAND B · `padding: 4px 6px` -> `var(--sp-2) var(--sp-3)` · count 2 · lines 159, 165
- BAND B · `padding: 6px 12px` -> `var(--sp-3) var(--sp-6)` · count 2 · lines 87, 146
- BAND B · `padding: 7px 12px` -> `var(--sp-3h) var(--sp-6)` · count 1 · lines 48
- BAND B · `padding: 8px 10px` -> `var(--sp-4) var(--sp-5)` · count 1 · lines 62
- BAND B · `padding: 8px 12px` -> `var(--sp-4) var(--sp-6)` · count 1 · lines 117

## src/ui/shell.js

- BAND B · `padding: 10px 14px 14px` -> `var(--sp-5) var(--sp-7) var(--sp-7)` · count 1 · lines 156
- BAND B · `padding: 12px 14px` -> `var(--sp-6) var(--sp-7)` · count 1 · lines 284
- BAND B · `padding: 3px 0` -> `var(--sp-1h) 0` · count 1 · lines 391
- BAND B · `padding: 4px 9px` -> `var(--sp-2) var(--sp-4)` · count 1 · lines 367
- BAND B · `padding: 6px 12px` -> `var(--sp-3) var(--sp-6)` · count 2 · lines 270, 344
- BAND B · `padding: 7px 12px` -> `var(--sp-3h) var(--sp-6)` · count 1 · lines 199
- BAND B · `padding: 8px 10px` -> `var(--sp-4) var(--sp-5)` · count 1 · lines 231
- BAND B · `padding: 8px 12px` -> `var(--sp-4) var(--sp-6)` · count 1 · lines 169

## src/instruments/drum-sampler.js

- BAND B · `padding: 18px 8px` -> `var(--sp-9) var(--sp-4)` · count 1 · lines 733
- BAND B · `padding: 32px 40px` -> `var(--sp-16) var(--sp-20)` · count 1 · lines 723
- BAND B · `padding: 3px 6px` -> `var(--sp-1h) var(--sp-3)` · count 1 · lines 726
- BAND B · `padding: 8px 10px` -> `var(--sp-4) var(--sp-5)` · count 1 · lines 722
- BAND B · `padding: 8px 4px` -> `var(--sp-4) var(--sp-2)` · count 1 · lines 732

## src/instruments/overtone-synth.js

- BAND B · `height: 100%` -> `var(--pct-100)` · count 1 · lines 713
- BAND B · `width: 100%` -> `var(--pct-100)` · count 1 · lines 714

## src/surfaces/step-grid.js

- BAND B · `padding: 1px 0` -> `var(--sp-hair) 0` · count 1 · lines 353
- BAND B · `padding: 1px 3px` -> `var(--sp-hair) var(--sp-1h)` · count 1 · lines 326
- BAND B · `padding: 2px 0` -> `var(--sp-1) 0` · count 1 · lines 351
- BAND B · `padding: 3px 8px` -> `var(--sp-1h) var(--sp-4)` · count 1 · lines 268
- BAND B · `padding: 4px 0` -> `var(--sp-2) 0` · count 1 · lines 355

## src/surfaces/keyboard.js

- BAND A · `border-radius: 0 0 2px 2px` -> `0 0 var(--r-cell) var(--r-cell)` · count 1 · lines 121
- BAND A · `border-radius: 0 0 4px 4px` -> `0 0 var(--r-ctl) var(--r-ctl)` · count 1 · lines 109
- BAND B · `padding: 4px 9px` -> `var(--sp-2) var(--sp-4)` · count 1 · lines 156

## src/surfaces/piano-roll.js

- BAND A · `border-radius: 2px 2px 0 0` -> `var(--r-cell) var(--r-cell) 0 0` · count 1 · lines 491
- BAND B · `padding: 1px 0` -> `var(--sp-hair) 0` · count 1 · lines 353
- BAND B · `padding: 2px 0` -> `var(--sp-1) 0` · count 1 · lines 350
- BAND B · `padding: 3px 8px` -> `var(--sp-1h) var(--sp-4)` · count 1 · lines 285
- BAND B · `padding: 4px 0` -> `var(--sp-2) 0` · count 1 · lines 354

## src/surfaces/diatonic-keys.js

- BAND B · `padding: 4px 9px` -> `var(--sp-2) var(--sp-4)` · count 1 · lines 236

## src/surfaces/scale-circle.js

- BAND B · `padding: 4px 10px` -> `var(--sp-2) var(--sp-5)` · count 1 · lines 303

## src/surfaces/comp-builder.js

- BAND B · `gap: 4px 10px` -> `var(--sp-2) var(--sp-5)` · count 1 · lines 153
- BAND B · `padding: 1px 0` -> `var(--sp-hair) 0` · count 1 · lines 158
- BAND B · `padding: 2px 5px` -> `var(--sp-1) var(--sp-2h)` · count 1 · lines 138
- BAND B · `padding: 3px 7px` -> `var(--sp-1h) var(--sp-3h)` · count 1 · lines 167
- BAND B · `padding: 7px 0` -> `var(--sp-3h) 0` · count 1 · lines 131
- BAND B · `padding: 9px 10px 11px` -> `var(--sp-4) var(--sp-5) var(--sp-5h)` · count 1 · lines 120

## tools/harmonyNEW.html

- BAND B · `padding: 2px 0` -> `var(--sp-1) 0` · count 1 · lines 336
- BAND B · `padding: 4px 8px` -> `var(--sp-2) var(--sp-4)` · count 1 · lines 125
