import type { SiteVariablesPrepared } from "@fluentui/react-northstar";

export const redButtonVariables = (siteVariables: SiteVariablesPrepared) => {
    // console.log(siteVariables);
  const { red, white } = siteVariables.colorScheme;

  return {
    /* Base */
    color: white.foreground,
    backgroundColor: red.background,
    borderColor: red.border,

    /* Hover */
    colorHover: white.foreground,
    backgroundColorHover: red.backgroundHover,
    borderColorHover: red.borderHover,

    /* Active */
    colorActive: white.foreground,
    backgroundColorActive: red.backgroundPressed,
    borderColorActive: red.backgroundPressed,

    /* Focus (keyboard) */
    colorFocus: white.foreground,
    backgroundColorFocus: red.backgroundColorHover1,
    borderColorFocus: red.backgroundPressed,
    boxShadowFocus: siteVariables.focusOuterBorderColor
      ? `0 0 0 2px ${siteVariables.focusOuterBorderColor}`
      : undefined,

    /* Disabled */
    colorDisabled: siteVariables.colors.grey[300],
    backgroundColorDisabled: siteVariables.colors.grey[50],
    borderColorDisabled: siteVariables.colors.grey[150],
  };
};
